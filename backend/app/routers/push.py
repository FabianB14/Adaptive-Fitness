"""Push notification endpoints: config and self-check, subscribe with a
per-kind schedule, unsubscribe, and on-demand test sends."""

from datetime import date

from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services import push

router = APIRouter(prefix="/push", tags=["push"])


class SubscriptionKeys(BaseModel):
    p256dh: str
    auth: str


class Subscription(BaseModel):
    endpoint: str
    keys: SubscriptionKeys


class SubscribeRequest(BaseModel):
    subscription: Subscription
    # kind id → local hour (0–23). Kinds left out are switched off.
    reminders: dict[str, int] = Field(default_factory=dict)
    # Local − UTC, in minutes (JS: -new Date().getTimezoneOffset()).
    offset_minutes: int = Field(ge=-14 * 60, le=14 * 60, default=0)


class EndpointRequest(BaseModel):
    endpoint: str


class TestRequest(BaseModel):
    endpoint: str
    kind: str | None = None


@router.get("/config")
def config() -> dict:
    """Everything the app needs to explain itself: the public key, and a
    frank self-check of the server's push configuration."""
    health = push.key_health()
    return {
        "configured": push.is_configured(),
        "public_key": settings.vapid_public_key or None,
        "healthy": health["ok"],
        "problems": health["problems"],
    }


@router.get("/types")
def types() -> dict:
    """The reminder kinds a person can switch on, with a sample message."""
    today = date.today()
    return {
        "types": [
            {
                "id": k.id,
                "label": k.label,
                "emoji": k.emoji,
                "purpose": k.purpose,
                "default_hour": k.default_hour,
                "default_on": k.default_on,
                "weekday": k.weekday,
                "sample": dict(zip(("title", "body"), push.message_for(k.id, today))),
                "message_count": len(k.messages),
            }
            for k in push.KINDS
        ]
    }


def _require_configured() -> None:
    if not push.is_configured():
        raise HTTPException(
            status_code=503,
            detail="Push isn't configured on this server (VAPID keys missing).",
        )


@router.post("/subscribe")
def subscribe(req: SubscribeRequest) -> dict:
    _require_configured()
    unknown = [k for k in req.reminders if k not in push.KINDS_BY_ID]
    if unknown:
        raise HTTPException(status_code=422, detail=f"Unknown reminder kinds: {unknown}")
    if any(not 0 <= h <= 23 for h in req.reminders.values()):
        raise HTTPException(status_code=422, detail="Hours must be between 0 and 23.")
    count = push.upsert_subscription(
        req.subscription.model_dump(), req.reminders, req.offset_minutes
    )
    return {"ok": True, "subscriptions": count, "reminders": len(req.reminders)}


@router.post("/unsubscribe")
def unsubscribe(req: EndpointRequest) -> dict:
    push.remove_subscription(req.endpoint)
    return {"ok": True}


@router.post("/hello")
async def hello(req: TestRequest) -> dict:
    """Send a notification right now — the opt-in confirmation and a live
    end-to-end test in one. With `kind`, sends that kind's message so
    people can hear what each switch actually does."""
    _require_configured()
    entry = push.find_subscription(req.endpoint)
    if entry is None:
        raise HTTPException(
            status_code=404,
            detail="This device isn't subscribed on the server. Turn reminders off and on again.",
        )
    if req.kind and req.kind not in push.KINDS_BY_ID:
        raise HTTPException(status_code=422, detail=f"Unknown reminder kind: {req.kind}")

    title, body = (
        push.message_for(req.kind, date.today()) if req.kind else push.WELCOME
    )
    tag = f"af-{req.kind}" if req.kind else "af-hello"
    ok = await run_in_threadpool(push.send_push, entry["subscription"], title, body, tag)
    if not ok:
        # Run it again for the *reason* — the app shows this verbatim.
        reason = await run_in_threadpool(push.describe_failure, entry["subscription"])
        raise HTTPException(
            status_code=502,
            detail=reason or "The push service didn't accept it.",
        )
    return {"ok": True, "title": title}


@router.get("/preview")
def preview(kind: str = "daily_plan") -> dict:
    """Today's message for a kind, for showing in the UI before anyone
    subscribes."""
    if kind not in push.KINDS_BY_ID:
        raise HTTPException(status_code=404, detail=f"Unknown reminder kind: {kind}")
    title, body = push.message_for(kind, date.today())
    return {"title": title, "body": body}


@router.get("/status")
def status(endpoint: str) -> dict:
    """What the server believes about one device — the last piece the app
    needs to explain a silent failure."""
    entry = push.find_subscription(endpoint)
    if entry is None:
        return {"known": False, "reminders": {}}
    return {
        "known": True,
        "offset_minutes": entry.get("offset_minutes", 0),
        "reminders": entry.get("reminders", {}),
    }
