"""Medical document extraction — the only AI call in the product.

The pipeline: document bytes in memory → Claude with a strict JSON schema →
structured constraints out → bytes discarded. Nothing is ever written to
disk or object storage, which is what lets the UI say "your paperwork is
gone" truthfully.

Extraction rules (from the product brief):
- Extract stated limitations only. Never diagnose, never interpret prognosis.
- When confidence is low, restrict rather than permit.
- Anything unreadable goes to unparsed_flags instead of being guessed at.
"""
from __future__ import annotations

import base64
import json
import os
import re

import anthropic

ACCEPTED_MEDIA_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}

# The app's closed vocabulary (mirrors shared/vocabulary.json).
BODY_REGIONS = {
    "ankle", "knee", "hip", "lumbar", "thoracic", "cervical",
    "shoulder", "elbow", "wrist",
}
CONTRAINDICATED_PATTERNS = {
    "axial_loading", "spinal_flexion_under_load", "spinal_extension_under_load",
    "spinal_rotation_under_load", "overhead_pressing",
    "deep_knee_flexion_under_load", "high_impact", "breath_holding_valsalva",
    "unsupported_standing",
}

# Common ways documents name regions → our vocabulary.
REGION_SYNONYMS = {
    "lumbar": "lumbar", "lumbar_spine": "lumbar", "low_back": "lumbar",
    "lower_back": "lumbar", "lumbosacral": "lumbar", "si_joint": "lumbar",
    "thoracic": "thoracic", "thoracic_spine": "thoracic",
    "upper_back": "thoracic", "mid_back": "thoracic",
    "cervical": "cervical", "cervical_spine": "cervical", "neck": "cervical",
    "knee": "knee", "patella": "knee", "meniscus": "knee",
    "hip": "hip", "pelvis": "hip", "glute": "hip",
    "ankle": "ankle", "foot": "ankle", "achilles": "ankle", "heel": "ankle",
    "shoulder": "shoulder", "rotator_cuff": "shoulder", "ac_joint": "shoulder",
    "elbow": "elbow", "forearm": "elbow",
    "wrist": "wrist", "hand": "wrist", "carpal": "wrist",
}

LOW_CONFIDENCE = 0.7

SYSTEM_PROMPT = """You extract physical training limitations from medical \
documents (VA rating decisions, physical therapy notes, discharge paperwork, \
imaging reports).

Rules, in priority order:
1. Extract STATED limitations only. Never diagnose, never infer severity \
beyond what the document says, never interpret prognosis.
2. When a finding is ambiguous or partially legible, lower the confidence \
score rather than guessing — the application restricts rather than permits \
on low confidence.
3. Anything you cannot read or classify goes into unparsed_flags with a \
short description of where it appears.
4. severity reflects the document's language: "mild" for minor or resolved \
findings, "moderate" for documented ongoing limitations, "severe" for \
ratings/findings indicating substantial impairment.
5. contraindicated_patterns lists movement patterns the document's findings \
make unwise, using only the allowed identifiers.
6. notes_for_user are short plain-language sentences a layperson can read.
Respond with JSON matching the schema exactly."""

EXTRACTION_SCHEMA = {
    "type": "object",
    "properties": {
        "regions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "area": {"type": "string", "description": "Body region, e.g. lumbar_spine, left_knee"},
                    "severity": {"type": "string", "enum": ["mild", "moderate", "severe"]},
                    "source": {"type": "string", "description": "Where in the document, e.g. 'VA rating 40%'"},
                    "confidence": {"type": "number"},
                },
                "required": ["area", "severity", "source", "confidence"],
                "additionalProperties": False,
            },
        },
        "contraindicated_patterns": {
            "type": "array",
            "items": {
                "type": "string",
                "enum": sorted(CONTRAINDICATED_PATTERNS),
            },
        },
        "rom_limits": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "joint": {"type": "string"},
                    "motion": {"type": "string", "enum": ["flexion", "extension", "abduction", "rotation"]},
                    "max_deg": {"type": "integer"},
                },
                "required": ["joint", "motion", "max_deg"],
                "additionalProperties": False,
            },
        },
        "cardio_impact_ceiling": {
            "type": "string",
            "enum": ["none", "low", "moderate", "high"],
            "description": "Highest impact level the findings support; 'high' when nothing limits impact",
        },
        "notes_for_user": {"type": "array", "items": {"type": "string"}},
        "unparsed_flags": {"type": "array", "items": {"type": "string"}},
    },
    "required": [
        "regions", "contraindicated_patterns", "rom_limits",
        "cardio_impact_ceiling", "notes_for_user", "unparsed_flags",
    ],
    "additionalProperties": False,
}


class ExtractionRefused(Exception):
    """The model declined to process this document."""


def is_configured() -> bool:
    return bool(os.environ.get("ANTHROPIC_API_KEY"))


def extract_from_document(data: bytes, media_type: str) -> dict:
    """One model call. The document exists only as this in-memory payload."""
    from app.core.config import settings

    encoded = base64.standard_b64encode(data).decode("utf-8")
    if media_type == "application/pdf":
        source_block = {
            "type": "document",
            "source": {"type": "base64", "media_type": media_type, "data": encoded},
        }
    else:
        source_block = {
            "type": "image",
            "source": {"type": "base64", "media_type": media_type, "data": encoded},
        }

    client = anthropic.Anthropic()
    response = client.messages.create(
        model=settings.extract_model,
        max_tokens=16000,
        system=SYSTEM_PROMPT,
        output_config={"format": {"type": "json_schema", "schema": EXTRACTION_SCHEMA}},
        messages=[
            {
                "role": "user",
                "content": [
                    source_block,
                    {
                        "type": "text",
                        "text": "Extract the training limitations stated in this document.",
                    },
                ],
            }
        ],
    )
    if response.stop_reason == "refusal":
        raise ExtractionRefused()
    text = next(b.text for b in response.content if b.type == "text")
    return json.loads(text)


# ------------------------------------------------------------- normalization

def _normalize_region(area: str) -> tuple[str | None, str | None]:
    """Map a document's region name to our vocabulary. Returns
    (region, side) — region None when unmappable."""
    key = re.sub(r"[^a-z]+", "_", area.strip().lower()).strip("_")
    side = None
    for marker in ("left", "right", "bilateral"):
        if key.startswith(marker + "_"):
            side = marker
            key = key[len(marker) + 1:]
        elif key.endswith("_" + marker):
            side = marker
            key = key[: -(len(marker) + 1)]
    if key in REGION_SYNONYMS:
        return REGION_SYNONYMS[key], side
    if key.endswith("s") and key[:-1] in REGION_SYNONYMS:
        return REGION_SYNONYMS[key[:-1]], side
    return None, side


def _suggested_state(severity: str, confidence: float) -> str:
    """Severity → region state, escalated one step on low confidence.
    Restrict rather than permit, always."""
    state = "suppressed" if severity == "severe" else "easing"
    if confidence < LOW_CONFIDENCE and state == "easing":
        state = "suppressed"
    return state


def sanitize(raw: dict) -> dict:
    """Validate the model's output against the app vocabulary. Anything that
    doesn't map cleanly is demoted to unparsed_flags — never guessed at."""
    unparsed = [str(f) for f in raw.get("unparsed_flags", [])]

    regions = []
    for item in raw.get("regions", []):
        region, side = _normalize_region(str(item.get("area", "")))
        confidence = float(item.get("confidence", 0))
        severity = str(item.get("severity", "moderate"))
        if region is None:
            unparsed.append(f"unrecognized region: {item.get('area')}")
            continue
        regions.append(
            {
                "region": region,
                "side": side,
                "severity": severity,
                "source": str(item.get("source", "")),
                "confidence": confidence,
                "low_confidence": confidence < LOW_CONFIDENCE,
                "suggested_state": _suggested_state(severity, confidence),
            }
        )

    patterns = [
        p for p in raw.get("contraindicated_patterns", [])
        if p in CONTRAINDICATED_PATTERNS
    ]

    rom_limits = []
    for item in raw.get("rom_limits", []):
        joint, _ = _normalize_region(str(item.get("joint", "")))
        if joint is None:
            unparsed.append(f"unrecognized joint: {item.get('joint')}")
            continue
        rom_limits.append(
            {
                "joint": joint,
                "motion": str(item.get("motion", "flexion")),
                "max_deg": int(item.get("max_deg", 0)),
            }
        )

    ceiling = raw.get("cardio_impact_ceiling", "moderate")
    if ceiling not in {"none", "low", "moderate", "high"}:
        ceiling = "low"  # unknown → restrictive

    return {
        "regions": regions,
        "contraindicated_patterns": patterns,
        "rom_limits": rom_limits,
        "cardio_impact_ceiling": ceiling,
        "notes_for_user": [str(n) for n in raw.get("notes_for_user", [])],
        "unparsed_flags": unparsed,
    }
