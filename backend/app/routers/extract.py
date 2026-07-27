import anthropic
from fastapi import APIRouter, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from app.services import extraction

router = APIRouter(tags=["extraction"])

MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_PDF_BYTES = 25 * 1024 * 1024


@router.post("/extract")
async def extract_document(file: UploadFile) -> dict:
    """Read a medical document, return structured constraints, keep nothing.

    The uploaded bytes live only in this request's memory. They are sent to
    the model once and discarded when the request ends — no disk, no object
    storage, no logging of content.
    """
    if not extraction.is_configured():
        raise HTTPException(
            503,
            "Document reading isn't set up on this server yet — the "
            "ANTHROPIC_API_KEY environment variable is missing.",
        )

    media_type = file.content_type or ""
    if media_type not in extraction.ACCEPTED_MEDIA_TYPES:
        raise HTTPException(
            415,
            "That file type isn't supported. Send a PDF or a photo "
            "(JPEG, PNG, WebP, or GIF).",
        )

    data = await file.read()
    limit = MAX_PDF_BYTES if media_type == "application/pdf" else MAX_IMAGE_BYTES
    if len(data) > limit:
        raise HTTPException(
            413,
            f"That file is too large ({len(data) // (1024 * 1024)} MB). "
            f"The limit is {limit // (1024 * 1024)} MB — a photo of each "
            "page works well.",
        )
    if len(data) == 0:
        raise HTTPException(422, "That file appears to be empty.")

    try:
        raw = await run_in_threadpool(
            extraction.extract_from_document, data, media_type
        )
    except extraction.ExtractionRefused:
        raise HTTPException(
            422,
            "We couldn't read this document. You can enter your limits "
            "manually instead — the plan works exactly the same way.",
        )
    except anthropic.RateLimitError:
        raise HTTPException(429, "The reader is busy right now — try again in a minute.")
    except anthropic.APIStatusError:
        raise HTTPException(502, "The document reader had a problem. Try again shortly.")
    except anthropic.APIConnectionError:
        raise HTTPException(502, "Couldn't reach the document reader. Try again shortly.")

    result = extraction.sanitize(raw)
    result["document_retained"] = False
    return result
