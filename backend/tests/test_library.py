"""Seed-quality gates. These tests are the contract for the exercise pool:
size, tag validity, and — most importantly — coverage of the population we
serve (seated, supine, low-impact, wheelchair-adaptable options everywhere).
"""
from collections import Counter

from fastapi.testclient import TestClient

from app.data.library import IMPACT_ORDER, exercises, filter_exercises, vocabulary
from app.main import app

client = TestClient(app)
POOL = exercises()


def test_pool_is_at_least_120():
    assert len(POOL) >= 120, f"only {len(POOL)} exercises seeded"


def test_slugs_unique():
    counts = Counter(e.slug for e in POOL)
    assert all(n == 1 for n in counts.values())


def test_every_pattern_has_depth():
    by_pattern = Counter(e.movement_pattern for e in POOL)
    for pattern in vocabulary()["movement_pattern"]:
        assert by_pattern[pattern] >= 6, f"{pattern} has only {by_pattern[pattern]}"


def test_every_pattern_has_a_minimum_tier_option():
    # The five-minute day must be servable for every movement pattern.
    for pattern in vocabulary()["movement_pattern"]:
        options = [
            e for e in POOL
            if e.movement_pattern == pattern and e.intensity_tier == "minimum"
        ]
        assert options, f"{pattern} has no minimum-tier option"


def test_heavy_low_impact_coverage():
    low = [e for e in POOL if e.impact_level in ("none", "low")]
    assert len(low) >= int(len(POOL) * 0.9)


def test_seated_supine_coverage():
    # The population we serve needs non-standing options in bulk.
    non_standing = [e for e in POOL if e.position != "standing"]
    assert len(non_standing) >= 60, f"only {len(non_standing)} non-standing"


def test_wheelchair_coverage_across_upper_body_patterns():
    for pattern in ("push_h", "push_v", "pull_h", "pull_v", "rotate", "carry", "gait"):
        options = [
            e for e in POOL if e.movement_pattern == pattern and e.wheelchair_ok
        ]
        assert options, f"{pattern} has no wheelchair-adaptable option"


def test_axial_load_and_overhead_have_substitutes():
    # For every pattern that contains axial/overhead work there must be a
    # same-pattern alternative without it — the engine's swap guarantee.
    for pattern in {e.movement_pattern for e in POOL if e.axial_load}:
        clean = filter_exercises(POOL, pattern=pattern, no_axial_load=True)
        assert clean, f"{pattern} has no non-axial alternative"
    overhead_patterns = {
        e.movement_pattern for e in POOL if "overhead_pressing" in e.flags
    }
    for pattern in overhead_patterns:
        clean = filter_exercises(
            POOL, pattern=pattern, exclude_flags=["overhead_pressing"]
        )
        assert clean, f"{pattern} has no non-overhead alternative"


def test_rom_limit_filter_is_restrictive():
    # A knee capped at 110° must exclude anything demanding more.
    kept = filter_exercises(POOL, rom_limits={"knee": 110})
    assert all(e.rom_demand.get("knee", 0) <= 110 for e in kept)
    assert not any(e.slug == "childs-pose-rock" for e in kept)  # demands 130°


def test_region_suppression_filter():
    kept = filter_exercises(POOL, exclude_regions=["lumbar"])
    assert kept
    assert all("lumbar" not in e.joints_loaded for e in kept)


def test_impact_order_matches_vocabulary():
    assert IMPACT_ORDER == vocabulary()["impact_level"]


# ---- API ----

def test_vocabulary_endpoint():
    r = client.get("/vocabulary")
    assert r.status_code == 200
    assert "movement_pattern" in r.json()


def test_exercises_endpoint_filters():
    r = client.get(
        "/exercises",
        params={
            "pattern": "push_v",
            "exclude_flags": ["overhead_pressing"],
            "max_impact": "low",
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["count"] > 0
    for e in body["exercises"]:
        assert e["movement_pattern"] == "push_v"
        assert "overhead_pressing" not in e["flags"]


def test_exercises_endpoint_rejects_unknown_pattern():
    assert client.get("/exercises", params={"pattern": "yoga"}).status_code == 422


def test_exercise_detail():
    assert client.get("/exercises/goblet-squat").status_code == 200
    assert client.get("/exercises/not-a-thing").status_code == 404
