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


@pytest.fixture
def configured(monkeypatch):
    monkeypatch.setattr(settings, "vapid_public_key", "B" * 87)
    monkeypatch.setattr(settings, "vapid_private_key", "sk")
    monkeypatch.setattr(settings, "vapid_subject", "mailto:real@example.com")


SUB = {
    "endpoint": "https://push.example/abc",
    "keys": {"p256dh": "key", "auth": "secret"},
}


# ------------------------------------------------------------ cute messages

BANNED = ["miss", "fail", "guilt", "lazy", "behind", "should", "broke", "shame", "excuse"]


def test_every_message_is_kind_and_cute():
    pools = [m for k in push.KINDS for m in k.messages] + [push.WELCOME]
    for title, body in pools:
        text = (title + " " + body).lower()
        for word in BANNED:
            assert word not in text, f"banned word {word!r} in {title!r}"
        assert any(ord(ch) > 0x2600 for ch in title), f"no emoji in {title!r}"


def test_each_kind_has_its_own_varied_pool():
    for kind in push.KINDS:
        assert len(kind.messages) >= 3, f"{kind.id} needs more variety"
        assert len(set(kind.messages)) == len(kind.messages), f"{kind.id} repeats"
    # Kinds don't share copy — each switch sounds like its own thing.
    all_titles = [t for k in push.KINDS for t, _ in k.messages]
    assert len(set(all_titles)) == len(all_titles)


def test_message_rotation_is_deterministic_per_kind():
    a = push.message_for("daily_plan", date(2026, 7, 28))
    assert push.message_for("daily_plan", date(2026, 7, 28)) == a
    assert push.message_for("move", date(2026, 7, 28)) != a


# ------------------------------------------------------------------- timing

def test_due_inside_local_hour_once_per_day():
    # 16:30 UTC at offset −420 (UTC−7) → 09:30 local.
    now = datetime(2026, 7, 28, 16, 30, tzinfo=timezone.utc)
    assert push.is_due(now, -420, 9, None) is True
    assert push.is_due(now, -420, 9, "2026-07-28") is False  # already sent today
    assert push.is_due(now, -420, 9, "2026-07-27") is True  # yesterday doesn't count
    assert push.is_due(now, -420, 10, None) is False  # wrong hour
    assert push.is_due(now, 0, 9, None) is False  # different timezone


def test_weekly_kind_only_fires_on_its_weekday():
    # 2026-08-02 is a Sunday; 2026-07-28 is a Tuesday.
    sunday = datetime(2026, 8, 2, 18, 5, tzinfo=timezone.utc)
    tuesday = datetime(2026, 7, 28, 18, 5, tzinfo=timezone.utc)
    assert push.is_due(sunday, 0, 18, None, weekday=6) is True
    assert push.is_due(tuesday, 0, 18, None, weekday=6) is False


# ------------------------------------------------------------------ storage

def test_subscribe_upserts_and_keeps_sent_marks():
    push.upsert_subscription(SUB, {"daily_plan": 9, "move": 15}, -420)
    push.mark_sent(SUB["endpoint"], "daily_plan", "2026-07-28")
    # Re-registering on app launch must not cause a duplicate send.
    assert push.upsert_subscription(SUB, {"daily_plan": 9, "move": 15}, -420) == 1
    entry = push.load_subscriptions()[0]
    assert entry["reminders"]["daily_plan"]["last_sent"] == "2026-07-28"
    assert entry["reminders"]["move"]["hour"] == 15


def test_switching_a_kind_off_removes_it():
    push.upsert_subscription(SUB, {"daily_plan": 9, "move": 15}, 0)
    push.upsert_subscription(SUB, {"daily_plan": 9}, 0)
    assert set(push.load_subscriptions()[0]["reminders"]) == {"daily_plan"}


def test_old_single_reminder_entries_migrate(tmp_path):
    import json

    path = tmp_path / "subs.json"
    settings.push_store_path = str(path)
    path.write_text(
        json.dumps([{"subscription": SUB, "hour": 7, "offset_minutes": 0, "last_sent": "2026-07-01"}])
    )
    entry = push.load_subscriptions()[0]
    assert entry["reminders"] == {"daily_plan": {"hour": 7, "last_sent": "2026-07-01"}}


# ------------------------------------------------------------- self-check

def test_config_reports_missing_keys_as_problems():
    body = client.get("/push/config").json()
    assert body["configured"] is False
    assert body["healthy"] is False
    assert any("AF_VAPID_PUBLIC_KEY" in p for p in body["problems"])


def test_config_flags_placeholder_subject(monkeypatch):
    monkeypatch.setattr(settings, "vapid_public_key", "B" * 87)
    monkeypatch.setattr(settings, "vapid_private_key", "sk")
    monkeypatch.setattr(settings, "vapid_subject", "mailto:push@adaptive-fitness.invalid")
    problems = client.get("/push/config").json()["problems"]
    assert any("placeholder" in p for p in problems)


def test_config_flags_pem_pasted_into_public_key(monkeypatch):
    monkeypatch.setattr(settings, "vapid_public_key", "-----BEGIN PUBLIC KEY-----")
    monkeypatch.setattr(settings, "vapid_private_key", "sk")
    problems = client.get("/push/config").json()["problems"]
    assert any("PEM" in p for p in problems)


# ---------------------------------------------------------------- endpoints

def test_types_lists_every_switch_with_a_sample():
    types = client.get("/push/types").json()["types"]
    assert {t["id"] for t in types} == {k.id for k in push.KINDS}
    for t in types:
        assert t["sample"]["title"] and t["sample"]["body"]
        assert t["purpose"]


def test_endpoints_require_vapid_keys():
    r = client.post("/push/subscribe", json={"subscription": SUB, "reminders": {"daily_plan": 9}})
    assert r.status_code == 503


def test_subscribe_rejects_unknown_kinds(configured):
    r = client.post(
        "/push/subscribe",
        json={"subscription": SUB, "reminders": {"not_a_kind": 9}},
    )
    assert r.status_code == 422


def test_subscribe_and_status_roundtrip(configured):
    r = client.post(
        "/push/subscribe",
        json={
            "subscription": SUB,
            "reminders": {"daily_plan": 8, "weekly_win": 18},
            "offset_minutes": 60,
        },
    )
    assert r.status_code == 200 and r.json()["reminders"] == 2
    status = client.get("/push/status", params={"endpoint": SUB["endpoint"]}).json()
    assert status["known"] is True
    assert status["reminders"]["daily_plan"]["hour"] == 8
    client.post("/push/unsubscribe", json={"endpoint": SUB["endpoint"]})
    assert client.get("/push/status", params={"endpoint": SUB["endpoint"]}).json()["known"] is False


def test_hello_for_an_unknown_device_says_so(configured):
    r = client.post("/push/hello", json={"endpoint": "https://push.example/nope"})
    assert r.status_code == 404
    assert "isn't subscribed" in r.json()["detail"]


def test_hello_reports_the_real_reason_not_a_500(configured):
    # Garbage keys make pywebpush raise during encryption; the endpoint must
    # degrade to 502 with an explanation and prune the dead subscription.
    push.upsert_subscription(SUB, {"daily_plan": 9}, 0)
    r = client.post("/push/hello", json={"endpoint": SUB["endpoint"]})
    assert r.status_code == 502
    assert r.json()["detail"]  # a sentence, not an empty string
    assert push.load_subscriptions() == []


def test_hello_can_send_a_specific_kind(configured, monkeypatch):
    push.upsert_subscription(SUB, {"move": 15}, 0)
    sent: list[tuple[str, str]] = []
    monkeypatch.setattr(
        push, "send_push", lambda sub, title, body, tag="af": sent.append((title, tag)) or True
    )
    r = client.post("/push/hello", json={"endpoint": SUB["endpoint"], "kind": "move"})
    assert r.status_code == 200
    assert sent[0][1] == "af-move"
    assert sent[0][0] == push.message_for("move", date.today())[0]


def test_preview_per_kind():
    assert client.get("/push/preview", params={"kind": "food"}).json()["title"]
    assert client.get("/push/preview", params={"kind": "nope"}).status_code == 404


def test_scheduler_sends_each_due_kind_once(configured, monkeypatch):
    push.upsert_subscription(SUB, {"daily_plan": 9, "move": 9}, -420)
    tags: list[str] = []
    monkeypatch.setattr(
        push, "send_push", lambda sub, title, body, tag="af": tags.append(tag) or True
    )
    now = datetime(2026, 7, 28, 16, 5, tzinfo=timezone.utc)  # 09:05 local
    assert push.send_due_reminders(now) == 2
    assert sorted(tags) == ["af-daily_plan", "af-move"]
    # Second tick in the same hour: already marked, nothing sent.
    assert push.send_due_reminders(now) == 0
