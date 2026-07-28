"""Push notification endpoints: config, subscribe, unsubscribe, and an
immediate hello so people see a cute notification the moment they opt in."""

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
    # 24h local hour for the daily nudge.
    hour: int = Field(ge=0, le=23, default=9)
    # Local − UTC, in minutes (JS: -new Date().getTimezoneOffset()).
    offset_minutes: int = Field(ge=-14 * 60, le=14 * 60, default=0)


class UnsubscribeRequest(BaseModel):
    endpoint: str


@router.get("/config")
def config() -> dict:
    return {
        "configured": push.is_configured(),
        "public_key": settings.vapid_public_key or None,
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
    count = push.upsert_subscription(
        req.subscription.model_dump(), req.hour, req.offset_minutes
    )
    return {"ok": True, "subscriptions": count}


@router.post("/unsubscribe")
def unsubscribe(req: UnsubscribeRequest) -> dict:
    push.remove_subscription(req.endpoint)
    return {"ok": True}


@router.post("/hello")
async def hello(req: UnsubscribeRequest) -> dict:
    """Send the welcome notification right now — the opt-in confirmation
    and a live end-to-end test in one."""
    _require_configured()
    entry = next(
        (
            s
            for s in push.load_subscriptions()
            if s.get("subscription", {}).get("endpoint") == req.endpoint
        ),
        None,
    )
    if entry is None:
        raise HTTPException(status_code=404, detail="Subscription not found.")
    title, body = push.WELCOME
    ok = await run_in_threadpool(push.send_push, entry["subscription"], title, body)
    if not ok:
        raise HTTPException(status_code=502, detail="The push service didn't accept it.")
    return {"ok": True}


@router.get("/preview")
def preview() -> dict:
    """Today's message, for showing in the UI before anyone subscribes."""
    title, body = push.message_for(date.today())
    return {"title": title, "body": body}
