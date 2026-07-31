"""Web Push — step 9.

Several kinds of gentle nudge, each independently switchable and each with
its own hour and its own pool of messages. The tone rules are the same as
everywhere else in the product: reminders only ever invite. No guilt, no
"you missed", no broken streaks — the pools below are tested for banned
words.

Subscriptions live in a small JSON file. That's deliberate: the store is
self-healing because the app silently re-registers its subscription on
every launch, so an ephemeral disk (Render free tier) only ever costs a
reminder between deploy and next open.
"""

from __future__ import annotations

import json
import logging
import threading
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)


# ------------------------------------------------------------ reminder kinds


@dataclass(frozen=True)
class ReminderKind:
    id: str
    label: str
    emoji: str
    # What this reminder is *for* — shown next to its switch in the app.
    purpose: str
    default_hour: int
    default_on: bool
    # None = every day. 0–6 (Mon–Sun) = only that weekday.
    weekday: int | None = None
    messages: list[tuple[str, str]] = field(default_factory=list)


KINDS: list[ReminderKind] = [
    ReminderKind(
        id="daily_plan",
        label="Today's plan",
        emoji="🌱",
        purpose="A morning hello with your three days ready to pick from.",
        default_hour=9,
        default_on=True,
        messages=[
            ("🌱 Tiny plans, big kindness", "Your Full, Light, and Minimum days are ready. Any of them counts."),
            ("🌤️ However today feels", "Full, Light, Minimum, or rest — all four count as showing up."),
            ("🦋 A soft hello", "Your body sets the pace. The plan just follows along."),
            ("🧸 Easy does it", "Soft day? There's a plan shaped exactly like that."),
            ("✨ Your pace is the plan", "Nothing to catch up on — the plan already moved to meet you."),
            ("🐢 Slow is still forward", "Five gentle minutes today? That's a whole win in this app."),
            ("🌼 Good morning", "Three sizes of day are waiting. Pick the one that fits."),
        ],
    ),
    ReminderKind(
        id="move",
        label="Movement snack",
        emoji="👟",
        purpose="A midday nudge to walk, wheel, stretch — anything that moves.",
        default_hour=15,
        default_on=False,
        messages=[
            ("👟 Steps sneak up", "A short walk with the tracker adds up quietly."),
            ("🐝 A little buzz", "Fancy a movement snack? The library has tiny, gentle options."),
            ("🌳 Two minutes of air", "Even a lap around the room is movement your plan notices."),
            ("💃 Kitchen dancing counts", "Whatever gets you moving is the right kind of moving."),
            ("🪁 Stretch break", "A mobility minute is a real entry. Log it proudly."),
        ],
    ),
    ReminderKind(
        id="food",
        label="Food check-in",
        emoji="🍓",
        purpose="A friendly reminder to log a meal — data, never judgment.",
        default_hour=12,
        default_on=False,
        messages=[
            ("🍓 Fuel counts too", "A logged snack is data, not a confession."),
            ("🥑 What did lunch look like?", "Portion chips make it a two-tap job."),
            ("🍲 Eating is training", "Your body builds with what you give it. Log it when you can."),
            ("🫖 Little and often", "No perfect days needed — partial logs are still useful."),
        ],
    ),
    ReminderKind(
        id="evening_log",
        label="Evening check-in",
        emoji="🌙",
        purpose="A calm end-of-day prompt to log however the day went.",
        default_hour=20,
        default_on=False,
        messages=[
            ("🌙 No pressure, ever", "Tomorrow is built from whatever today turns out to be."),
            ("🌈 Rest is training", "If today is a rest day, log it proudly. It builds tomorrow."),
            ("🕯️ How did today feel?", "One tap is all it takes to shape tomorrow."),
            ("🛏️ Winding down", "Logging takes five seconds and shapes the whole week."),
        ],
    ),
    ReminderKind(
        id="weekly_win",
        label="Weekly celebration",
        emoji="⭐",
        purpose="A Sunday look at the stickers and streak you've collected.",
        default_hour=18,
        default_on=True,
        weekday=6,  # Sunday
        messages=[
            ("⭐ Sticker forecast", "Your shelf is waiting — see what this week added."),
            ("🏆 A week is a real thing", "However many days you moved, they all counted."),
            ("🌻 Weekly wrap", "Progress is quiet. Take a look at what stacked up."),
        ],
    ),
]

KINDS_BY_ID: dict[str, ReminderKind] = {k.id: k for k in KINDS}

WELCOME: tuple[str, str] = (
    "🎉 Notifications are on!",
    "Gentle nudges only — always kind, always optional. That's the deal.",
)


def message_for(kind_id: str, day: date) -> tuple[str, str]:
    """Deterministic daily rotation through a kind's pool."""
    kind = KINDS_BY_ID.get(kind_id)
    if kind is None or not kind.messages:
        return WELCOME
    return kind.messages[day.timetuple().tm_yday % len(kind.messages)]


def default_reminders() -> dict[str, int]:
    return {k.id: k.default_hour for k in KINDS if k.default_on}


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
    weekday: int | None = None,
) -> bool:
    """Due when the subscriber's local clock is inside the chosen hour, on
    the right weekday, and nothing has been sent yet on that local day.
    The full-hour window (not a single minute) makes the scheduler robust
    to sleeping servers that wake up late."""
    local = local_now(now_utc, offset_minutes)
    if weekday is not None and local.weekday() != weekday:
        return False
    if local.hour != hour:
        return False
    return last_sent_local_date != local.date().isoformat()


# ------------------------------------------------------------------ storage


def _store_path() -> Path:
    return Path(settings.push_store_path)


_lock = threading.Lock()


def _migrate(entry: dict[str, Any]) -> dict[str, Any]:
    """Old single-reminder entries used a flat hour/last_sent pair."""
    if "reminders" not in entry:
        hour = int(entry.pop("hour", 9))
        last = entry.pop("last_sent", None)
        entry["reminders"] = {"daily_plan": {"hour": hour, "last_sent": last}}
    return entry


def load_subscriptions() -> list[dict[str, Any]]:
    try:
        with _store_path().open() as f:
            data = json.load(f)
        return [_migrate(e) for e in data] if isinstance(data, list) else []
    except (OSError, json.JSONDecodeError):
        return []


def _save(subs: list[dict[str, Any]]) -> None:
    try:
        _store_path().write_text(json.dumps(subs, indent=1))
    except OSError:
        logger.warning("Could not persist push subscriptions", exc_info=True)


def upsert_subscription(
    subscription: dict[str, Any],
    reminders: dict[str, int],
    offset_minutes: int,
) -> int:
    """Add or refresh a subscription keyed by its endpoint URL. `reminders`
    maps kind id → local hour; kinds left out are switched off. Existing
    last_sent marks are preserved so re-registering on app launch never
    causes a duplicate send. Returns the stored subscription count."""
    with _lock:
        subs = load_subscriptions()
        endpoint = subscription.get("endpoint", "")
        previous = next(
            (s for s in subs if s.get("subscription", {}).get("endpoint") == endpoint),
            None,
        )
        prior_marks = (previous or {}).get("reminders", {})
        subs = [s for s in subs if s.get("subscription", {}).get("endpoint") != endpoint]
        subs.append(
            {
                "subscription": subscription,
                "offset_minutes": offset_minutes,
                "reminders": {
                    kind_id: {
                        "hour": hour,
                        "last_sent": prior_marks.get(kind_id, {}).get("last_sent"),
                    }
                    for kind_id, hour in reminders.items()
                    if kind_id in KINDS_BY_ID
                },
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


def mark_sent(endpoint: str, kind_id: str, local_date: str) -> None:
    with _lock:
        subs = load_subscriptions()
        for s in subs:
            if s.get("subscription", {}).get("endpoint") == endpoint:
                s.setdefault("reminders", {}).setdefault(kind_id, {})["last_sent"] = local_date
        _save(subs)


def find_subscription(endpoint: str) -> dict[str, Any] | None:
    return next(
        (
            s
            for s in load_subscriptions()
            if s.get("subscription", {}).get("endpoint") == endpoint
        ),
        None,
    )


# ------------------------------------------------------------------ sending


def is_configured() -> bool:
    return bool(settings.vapid_public_key and settings.vapid_private_key)


def key_health() -> dict[str, Any]:
    """Self-check the VAPID configuration so the app can say precisely
    what's wrong instead of 'that didn't work'."""
    problems: list[str] = []
    if not settings.vapid_public_key:
        problems.append("AF_VAPID_PUBLIC_KEY is not set.")
    if not settings.vapid_private_key:
        problems.append("AF_VAPID_PRIVATE_KEY is not set.")

    pub = settings.vapid_public_key.strip()
    if pub:
        if pub.startswith("-----"):
            problems.append(
                "AF_VAPID_PUBLIC_KEY looks like a PEM block; it must be the "
                "base64url string from `web-push generate-vapid-keys`."
            )
        elif len(pub) < 80:
            problems.append(
                f"AF_VAPID_PUBLIC_KEY looks too short ({len(pub)} chars; expect ~87)."
            )

    priv = settings.vapid_private_key.strip()
    if priv:
        try:
            from py_vapid import Vapid01

            Vapid01.from_string(private_key=priv)
        except Exception as exc:  # noqa: BLE001 — report anything as a problem
            if "BEGIN" in priv:
                problems.append(
                    "AF_VAPID_PRIVATE_KEY is a multi-line PEM block, which "
                    "environment variables mangle. Use the single-line "
                    "base64url private key from "
                    "`npx web-push generate-vapid-keys` instead."
                )
            else:
                problems.append(f"AF_VAPID_PRIVATE_KEY could not be read: {exc}")

    subject = settings.vapid_subject.strip()
    if not (subject.startswith("mailto:") or subject.startswith("https://")):
        problems.append(
            "AF_VAPID_SUBJECT must start with 'mailto:' or 'https://'."
        )
    elif subject.endswith(".invalid"):
        problems.append(
            "AF_VAPID_SUBJECT is still the placeholder address. Some push "
            "services (Apple's especially) reject unreachable domains — set "
            "it to a real mailto: address."
        )

    return {"ok": not problems, "problems": problems}


def send_push(subscription: dict[str, Any], title: str, body: str, tag: str = "af") -> bool:
    """Deliver one notification. Returns False (and prunes the
    subscription) when the endpoint is gone. Import is local so the
    module works in test environments without pywebpush installed."""
    from pywebpush import WebPushException, webpush

    try:
        webpush(
            subscription_info=subscription,
            data=json.dumps({"title": title, "body": body, "tag": tag}),
            vapid_private_key=settings.vapid_private_key.strip(),
            vapid_claims={"sub": settings.vapid_subject.strip()},
        )
        return True
    except WebPushException as exc:
        status = getattr(exc.response, "status_code", None)
        if status in (404, 410):  # endpoint expired — user gone, clean up
            remove_subscription(subscription.get("endpoint", ""))
        else:
            logger.warning("Push delivery failed: %s", exc)
        return False
    except (ValueError, TypeError) as exc:
        # Malformed subscription keys can never succeed — prune, don't retry.
        logger.warning("Unusable push subscription pruned: %s", exc)
        remove_subscription(subscription.get("endpoint", ""))
        return False


def describe_failure(subscription: dict[str, Any]) -> str:
    """Attempt a delivery and return a human-readable reason on failure.
    Used by the app's self-check so people see the real problem."""
    from pywebpush import WebPushException, webpush

    try:
        webpush(
            subscription_info=subscription,
            data=json.dumps({"title": WELCOME[0], "body": WELCOME[1], "tag": "af-hello"}),
            vapid_private_key=settings.vapid_private_key.strip(),
            vapid_claims={"sub": settings.vapid_subject.strip()},
        )
        return ""
    except WebPushException as exc:
        status = getattr(exc.response, "status_code", None)
        detail = ""
        try:
            detail = (exc.response.text or "").strip()[:200]
        except Exception:  # noqa: BLE001
            pass
        if status in (401, 403):
            return (
                f"The push service rejected the server's credentials ({status}). "
                "Usually the VAPID keys don't match the ones the app subscribed "
                "with, or AF_VAPID_SUBJECT isn't a real mailto: address. "
                f"{detail}"
            )
        if status in (404, 410):
            remove_subscription(subscription.get("endpoint", ""))
            return "This device's subscription expired. Turn reminders off and on again."
        return f"The push service said no ({status or 'no status'}). {detail}"
    except (ValueError, TypeError) as exc:
        remove_subscription(subscription.get("endpoint", ""))
        return f"This device's subscription couldn't be used: {exc}"


def send_due_reminders(now_utc: datetime | None = None) -> int:
    """One scheduler tick: send every due reminder of every kind to every
    subscriber. Returns how many notifications went out."""
    if not is_configured():
        return 0
    now = now_utc or datetime.now(timezone.utc)
    sent = 0
    for entry in load_subscriptions():
        offset = int(entry.get("offset_minutes", 0))
        endpoint = entry.get("subscription", {}).get("endpoint", "")
        for kind_id, state in entry.get("reminders", {}).items():
            kind = KINDS_BY_ID.get(kind_id)
            if kind is None:
                continue
            if not is_due(
                now,
                offset,
                int(state.get("hour", kind.default_hour)),
                state.get("last_sent"),
                kind.weekday,
            ):
                continue
            local_day = local_now(now, offset).date()
            title, body = message_for(kind_id, local_day)
            if send_push(entry["subscription"], title, body, tag=f"af-{kind_id}"):
                mark_sent(endpoint, kind_id, local_day.isoformat())
                sent += 1
    return sent
