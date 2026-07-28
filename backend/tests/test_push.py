from datetime import date, datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.services import push

client = TestClient(app)


@pytest.fixture(autouse=True)
def isolated_store(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "push_store_path", str(tmp_path / "subs.json"))


SUB = {
    "endpoint": "https://push.example/abc",
    "keys": {"p256dh": "key", "auth": "secret"},
}


# ------------------------------------------------------------ cute messages

BANNED = ["miss", "fail", "guilt", "lazy", "behind", "should", "broke", "shame", "excuse"]


def test_messages_are_kind_and_cute():
    for title, body in push.MESSAGES + [push.WELCOME]:
        text = (title + " " + body).lower()
        for word in BANNED:
            assert word not in text, f"banned word {word!r} in {title!r}"
        # Cute means at least one emoji in every title.
        assert any(ord(ch) > 0x2600 for ch in title), f"no emoji in {title!r}"


def test_message_rotation_is_deterministic_and_varied():
    a = push.message_for(date(2026, 7, 28))
    assert push.message_for(date(2026, 7, 28)) == a
    week = {push.message_for(date(2026, 7, 20 + i)) for i in range(7)}
    assert len(week) == 7  # a different message every day of a week


# ------------------------------------------------------------------- timing

def test_due_inside_local_hour_once_per_day():
    # 16:30 UTC at offset −420 (UTC−7) → 09:30 local.
    now = datetime(2026, 7, 28, 16, 30, tzinfo=timezone.utc)
    assert push.is_due(now, -420, 9, None) is True
    assert push.is_due(now, -420, 9, "2026-07-28") is False  # already sent today
    assert push.is_due(now, -420, 9, "2026-07-27") is True  # yesterday doesn't count
    assert push.is_due(now, -420, 10, None) is False  # wrong hour
    assert push.is_due(now, 0, 9, None) is False  # different timezone


# ------------------------------------------------------------------ storage

def test_subscribe_upserts_by_endpoint():
    assert push.upsert_subscription(SUB, 9, -420) == 1
    assert push.upsert_subscription(SUB, 18, -420) == 1  # same endpoint → replace
    entry = push.load_subscriptions()[0]
    assert entry["hour"] == 18
    assert push.remove_subscription(SUB["endpoint"]) == 0


# ---------------------------------------------------------------- endpoints

def test_endpoints_require_vapid_keys():
    r = client.post(
        "/push/subscribe",
        json={"subscription": SUB, "hour": 9, "offset_minutes": -420},
    )
    assert r.status_code == 503
    assert client.get("/push/config").json() == {"configured": False, "public_key": None}


def test_subscribe_and_unsubscribe_roundtrip(monkeypatch):
    monkeypatch.setattr(settings, "vapid_public_key", "pk")
    monkeypatch.setattr(settings, "vapid_private_key", "sk")
    r = client.post(
        "/push/subscribe",
        json={"subscription": SUB, "hour": 8, "offset_minutes": 60},
    )
    assert r.status_code == 200 and r.json()["subscriptions"] == 1
    r = client.post("/push/unsubscribe", json={"endpoint": SUB["endpoint"]})
    assert r.status_code == 200
    assert push.load_subscriptions() == []


def test_preview_returns_todays_message():
    body = client.get("/push/preview").json()
    assert body["title"] and body["body"]


def test_malformed_subscription_returns_502_not_500(monkeypatch):
    # A garbage p256dh key makes pywebpush raise ValueError during
    # encryption; the endpoint must degrade gracefully and prune the sub.
    monkeypatch.setattr(settings, "vapid_public_key", "pk")
    monkeypatch.setattr(settings, "vapid_private_key", "sk")
    push.upsert_subscription(SUB, 9, -420)
    r = client.post("/push/hello", json={"endpoint": SUB["endpoint"]})
    assert r.status_code == 502
    assert push.load_subscriptions() == []  # unusable sub was pruned


def test_scheduler_sends_and_marks(monkeypatch):
    monkeypatch.setattr(settings, "vapid_public_key", "pk")
    monkeypatch.setattr(settings, "vapid_private_key", "sk")
    push.upsert_subscription(SUB, 9, -420)
    sent_payloads = []
    monkeypatch.setattr(
        push, "send_push", lambda sub, title, body: sent_payloads.append(title) or True
    )
    now = datetime(2026, 7, 28, 16, 5, tzinfo=timezone.utc)  # 09:05 local
    assert push.send_due_reminders(now) == 1
    assert len(sent_payloads) == 1
    # Second tick in the same hour: already marked, nothing sent.
    assert push.send_due_reminders(now) == 0
