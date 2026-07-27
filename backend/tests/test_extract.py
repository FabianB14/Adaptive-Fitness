import io

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import extraction

client = TestClient(app)


@pytest.fixture(autouse=True)
def configured(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")


# ------------------------------------------------------------- sanitization

def test_region_synonyms_map_to_vocabulary():
    raw = {
        "regions": [
            {"area": "lumbar_spine", "severity": "moderate", "source": "VA rating 40%", "confidence": 0.9},
            {"area": "left_knee", "severity": "severe", "source": "PT note", "confidence": 0.95},
            {"area": "rotator cuff", "severity": "mild", "source": "MRI", "confidence": 0.8},
        ],
        "contraindicated_patterns": [], "rom_limits": [],
        "cardio_impact_ceiling": "low", "notes_for_user": [], "unparsed_flags": [],
    }
    out = extraction.sanitize(raw)
    assert [r["region"] for r in out["regions"]] == ["lumbar", "knee", "shoulder"]
    assert out["regions"][1]["side"] == "left"


def test_severity_maps_to_state_and_low_confidence_restricts():
    raw = {
        "regions": [
            {"area": "knee", "severity": "moderate", "source": "a", "confidence": 0.9},
            {"area": "hip", "severity": "moderate", "source": "b", "confidence": 0.4},
            {"area": "lumbar", "severity": "severe", "source": "c", "confidence": 0.9},
        ],
        "contraindicated_patterns": [], "rom_limits": [],
        "cardio_impact_ceiling": "moderate", "notes_for_user": [], "unparsed_flags": [],
    }
    out = extraction.sanitize(raw)
    states = {r["region"]: r["suggested_state"] for r in out["regions"]}
    assert states["knee"] == "easing"
    assert states["hip"] == "suppressed"  # low confidence escalates
    assert states["lumbar"] == "suppressed"
    assert out["regions"][1]["low_confidence"] is True


def test_unknown_regions_and_patterns_are_never_guessed():
    raw = {
        "regions": [{"area": "spleen", "severity": "mild", "source": "x", "confidence": 0.9}],
        "contraindicated_patterns": ["axial_loading", "made_up_pattern"],
        "rom_limits": [{"joint": "gallbladder", "motion": "flexion", "max_deg": 90}],
        "cardio_impact_ceiling": "warp_speed",
        "notes_for_user": [], "unparsed_flags": ["illegible section, page 3"],
    }
    out = extraction.sanitize(raw)
    assert out["regions"] == []
    assert out["contraindicated_patterns"] == ["axial_loading"]
    assert out["rom_limits"] == []
    assert out["cardio_impact_ceiling"] == "low"  # unknown → restrictive
    assert any("spleen" in f for f in out["unparsed_flags"])
    assert "illegible section, page 3" in out["unparsed_flags"]


# ------------------------------------------------------------------- routes

def _fake_extract(data, media_type):
    return {
        "regions": [{"area": "lumbar_spine", "severity": "moderate", "source": "VA rating 40%", "confidence": 0.9}],
        "contraindicated_patterns": ["axial_loading"],
        "rom_limits": [{"joint": "left_knee", "motion": "flexion", "max_deg": 110}],
        "cardio_impact_ceiling": "low",
        "notes_for_user": ["Bilateral knee findings — impact work limited"],
        "unparsed_flags": [],
    }


def test_extract_endpoint_happy_path(monkeypatch):
    monkeypatch.setattr(extraction, "extract_from_document", _fake_extract)
    r = client.post(
        "/extract",
        files={"file": ("doc.pdf", io.BytesIO(b"%PDF-1.4 fake"), "application/pdf")},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["document_retained"] is False
    assert body["regions"][0]["region"] == "lumbar"
    assert body["rom_limits"][0]["joint"] == "knee"


def test_extract_rejects_unsupported_types():
    r = client.post(
        "/extract",
        files={"file": ("doc.docx", io.BytesIO(b"x"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
    )
    assert r.status_code == 415


def test_extract_rejects_oversized_images(monkeypatch):
    monkeypatch.setattr(extraction, "extract_from_document", _fake_extract)
    big = io.BytesIO(b"0" * (5 * 1024 * 1024 + 1))
    r = client.post("/extract", files={"file": ("scan.jpg", big, "image/jpeg")})
    assert r.status_code == 413


def test_extract_unconfigured_returns_503(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    r = client.post(
        "/extract",
        files={"file": ("doc.pdf", io.BytesIO(b"%PDF"), "application/pdf")},
    )
    assert r.status_code == 503


def test_extract_refusal_offers_manual_path(monkeypatch):
    def refuse(data, media_type):
        raise extraction.ExtractionRefused()

    monkeypatch.setattr(extraction, "extract_from_document", refuse)
    r = client.post(
        "/extract",
        files={"file": ("doc.pdf", io.BytesIO(b"%PDF"), "application/pdf")},
    )
    assert r.status_code == 422
    assert "manually" in r.json()["detail"]
