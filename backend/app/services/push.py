"""Web Push — step 9.

One gentle nudge a day, at an hour the user picked, in their timezone.
The tone rules are the same as everywhere else in the product: reminders
only ever invite. No guilt, no "you missed", no broken streaks — the
message pool below is tested for banned words.

Subscriptions live in a small JSON file. That's deliberate: the store is
self-healing because the app silently re-registers its subscription on
every launch, so an ephemeral disk (Render free tier) only ever costs a
reminder between deploy and next open.
"""

from __future__ import annotations

import json
import logging
import threading
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

# ------------------------------------------------------------ cute messages

# (title, body) pairs. Rotated by day-of-year so everyone gets variety
# without any state. Emojis are the point — the client asked for cute.
MESSAGES: list[tuple[str, str]] = [
    ("🌱 Tiny plans, big kindness", "Your Full, Light, and Minimum days are ready. Any of them counts."),
    ("🐢 Slow is still forward", "Five gentle minutes today? That's a whole win in this app."),
    ("⭐ Sticker forecast", "You're one small session away from a shinier shelf."),
    ("🦋 A soft hello", "Your body sets the pace. The plan just follows along."),
    ("🌤️ However today feels", "Full, Light, Minimum, or rest — all four count as showing up."),
    ("🍓 Fuel counts too", "A logged snack is data, not a confession."),
    ("🌈 Rest is training", "If today is a rest day, log it proudly. It builds tomorrow."),
    ("🐝 A little buzz", "Fancy a movement snack? The library has tiny, gentle options."),
    ("👟 Steps sneak up", "A short walk with the tracker adds up quietly."),
    ("🌙 No pressure, ever", "Tomorrow is built from whatever today turns out to be."),
    ("🧸 Easy does it", "Soft day? There's a plan shaped exactly like that."),
    ("✨ Your pace is the plan", "Nothing to catch up on — the plan already moved to meet you."),
]

WELCOME: tuple[str, str] = (
    "🎉 Notifications are on!",
    "One gentle nudge a day — always kind, always optional. That's the deal.",
)


def message_for(day: date) -> tuple[str, str]:
    """Deterministic daily rotation through the pool."""
    return MESSAGES[day.timetuple().tm_yday % len(MESSAGES)]


# ------------------------------------------------------------------- timing


def local_now(now_utc: datetime, offset_minutes: int) -> datetime:
    """The subscriber's wall clock, from their reported UTC offset
    (local − UTC in minutes, e.g. −420 for UTC−7)."""
    return now_utc + timedelta(minutes=offset_minutes)


def is_due(
    now_utc: datetime,
    offset_minutes: int,
    hour: int,
    last_sent_local_date: str | None,
) -> bool:
    """Due when the subscriber's local clock is inside their chosen hour
    and nothing has been sent yet on that local day. The full-hour window
    (not a single minute) makes the scheduler robust to sleeping dynos
    waking up late."""
    local = local_now(now_utc, offset_minutes)
    if local.hour != hour:
        return False
    return last_sent_local_date != local.date().isoformat()


# ------------------------------------------------------------------ storage


def _store_path() -> Path:
    return Path(settings.push_store_path)


_lock = threading.Lock()


def load_subscriptions() -> list[dict[str, Any]]:
    try:
        with _store_path().open() as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except (OSError, json.JSONDecodeError):
        return []


def _save(subs: list[dict[str, Any]]) -> None:
    try:
        _store_path().write_text(json.dumps(subs, indent=1))
    except OSError:
        logger.warning("Could not persist push subscriptions", exc_info=True)


def upsert_subscription(
    subscription: dict[str, Any],
    hour: int,
    offset_minutes: int,
) -> int:
    """Add or refresh a subscription keyed by its endpoint URL.
    Returns the number of stored subscriptions."""
    with _lock:
        subs = load_subscriptions()
        endpoint = subscription.get("endpoint", "")
        subs = [s for s in subs if s.get("subscription", {}).get("endpoint") != endpoint]
        subs.append(
            {
                "subscription": subscription,
                "hour": hour,
                "offset_minutes": offset_minutes,
                "last_sent": None,
            }
        )
        _save(subs)
        return len(subs)


def remove_subscription(endpoint: str) -> int:
    with _lock:
        subs = load_subscriptions()
        subs = [s for s in subs if s.get("subscription", {}).get("endpoint") != endpoint]
        _save(subs)
        return len(subs)


def mark_sent(endpoint: str, local_date: str) -> None:
    with _lock:
        subs = load_subscriptions()
        for s in subs:
            if s.get("subscription", {}).get("endpoint") == endpoint:
                s["last_sent"] = local_date
        _save(subs)


# ------------------------------------------------------------------ sending


def is_configured() -> bool:
    return bool(settings.vapid_public_key and settings.vapid_private_key)


def send_push(subscription: dict[str, Any], title: str, body: str) -> bool:
    """Deliver one notification. Returns False (and prunes the
    subscription) when the endpoint is gone. Import is local so the
    module works in test environments without pywebpush installed."""
    from pywebpush import WebPushException, webpush

    try:
        webpush(
            subscription_info=subscription,
            data=json.dumps({"title": title, "body": body}),
            vapid_private_key=settings.vapid_private_key,
            vapid_claims={"sub": settings.vapid_subject},
        )
        return True
    except WebPushException as exc:
        status = getattr(exc.response, "status_code", None)
        if status in (404, 410):  # endpoint expired — user gone, clean up
            remove_subscription(subscription.get("endpoint", ""))
        else:
            logger.warning("Push delivery failed: %s", exc)
        return False


def send_due_reminders(now_utc: datetime | None = None) -> int:
    """One scheduler tick: send the daily message to every due subscriber.
    Returns how many were sent."""
    if not is_configured():
        return 0
    now = now_utc or datetime.now(timezone.utc)
    sent = 0
    for entry in load_subscriptions():
        offset = int(entry.get("offset_minutes", 0))
        if not is_due(now, offset, int(entry.get("hour", 9)), entry.get("last_sent")):
            continue
        local_day = local_now(now, offset).date()
        title, body = message_for(local_day)
        if send_push(entry["subscription"], title, body):
            mark_sent(entry["subscription"]["endpoint"], local_day.isoformat())
            sent += 1
    return sent
