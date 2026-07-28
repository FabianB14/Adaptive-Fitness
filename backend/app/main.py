import asyncio
import contextlib
import logging

from fastapi import FastAPI
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers.extract import router as extract_router
from app.routers.library import router as library_router
from app.routers.push import router as push_router
from app.services import push as push_service

logger = logging.getLogger(__name__)


async def _reminder_loop() -> None:
    """Once a minute, deliver the daily nudge to whoever is due. The due
    window is a full hour, so a server that was asleep still catches up."""
    while True:
        try:
            await run_in_threadpool(push_service.send_due_reminders)
        except Exception:  # never let the loop die
            logger.warning("Reminder tick failed", exc_info=True)
        await asyncio.sleep(60)


@contextlib.asynccontextmanager
async def lifespan(_: FastAPI):
    task = asyncio.create_task(_reminder_loop()) if push_service.is_configured() else None
    yield
    if task:
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task


app = FastAPI(title=settings.app_name, version=settings.version, lifespan=lifespan)
app.include_router(library_router)
app.include_router(extract_router)
app.include_router(push_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "version": settings.version}
