"""Exercise library loader.

shared/vocabulary.json and shared/exercises.json are the single source of
truth, shared verbatim with the frontend. Every exercise is validated against
the vocabulary at import time — a bad tag fails loudly at startup and in CI,
never silently at plan-generation time.

The library is read-mostly reference data; it lives in memory here. User data
(constraints, logs) goes to Postgres in later build steps, and this seed will
be loaded into an `exercises` table when plan generation needs to join
against it.
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel, field_validator, model_validator

SHARED_DIR = Path(__file__).resolve().parents[3] / "shared"

IMPACT_ORDER = ["none", "low", "moderate", "high"]


@lru_cache(maxsize=1)
def vocabulary() -> dict[str, list[str]]:
    with open(SHARED_DIR / "vocabulary.json") as f:
        return json.load(f)


class Exercise(BaseModel):
    slug: str
    name: str
    movement_pattern: str
    intensity_tier: str
    position: str
    equipment: str
    axial_load: bool
    impact_level: str
    joints_loaded: list[str]
    rom_demand: dict[str, int]
    flags: list[str]
    wheelchair_ok: bool
    cue: str

    @field_validator("movement_pattern")
    @classmethod
    def _pattern(cls, v: str) -> str:
        return _in_vocab(v, "movement_pattern")

    @field_validator("intensity_tier")
    @classmethod
    def _tier(cls, v: str) -> str:
        return _in_vocab(v, "intensity_tier")

    @field_validator("position")
    @classmethod
    def _position(cls, v: str) -> str:
        return _in_vocab(v, "position")

    @field_validator("equipment")
    @classmethod
    def _equipment(cls, v: str) -> str:
        return _in_vocab(v, "equipment")

    @field_validator("impact_level")
    @classmethod
    def _impact(cls, v: str) -> str:
        return _in_vocab(v, "impact_level")

    @field_validator("joints_loaded")
    @classmethod
    def _joints(cls, v: list[str]) -> list[str]:
        return [_in_vocab(j, "body_region") for j in v]

    @field_validator("flags")
    @classmethod
    def _flags(cls, v: list[str]) -> list[str]:
        return [_in_vocab(f, "contraindicated_pattern") for f in v]

    @model_validator(mode="after")
    def _rom_joints(self) -> "Exercise":
        for joint in self.rom_demand:
            _in_vocab(joint, "body_region")
        return self


def _in_vocab(value: str, key: str) -> str:
    if value not in vocabulary()[key]:
        raise ValueError(f"{value!r} is not in vocabulary[{key!r}]")
    return value


@lru_cache(maxsize=1)
def exercises() -> list[Exercise]:
    with open(SHARED_DIR / "exercises.json") as f:
        raw = json.load(f)
    pool = [Exercise.model_validate(item) for item in raw]
    slugs = [e.slug for e in pool]
    dupes = {s for s in slugs if slugs.count(s) > 1}
    if dupes:
        raise ValueError(f"duplicate exercise slugs: {sorted(dupes)}")
    return pool


def filter_exercises(
    pool: list[Exercise],
    *,
    pattern: str | None = None,
    equipment: list[str] | None = None,
    position: str | None = None,
    tier: str | None = None,
    max_impact: str | None = None,
    exclude_flags: list[str] | None = None,
    no_axial_load: bool = False,
    wheelchair_only: bool = False,
    exclude_regions: list[str] | None = None,
    rom_limits: dict[str, int] | None = None,
) -> list[Exercise]:
    """The deterministic filter the plan generator builds on.

    `exclude_regions` drops any exercise loading a suppressed body region;
    `rom_limits` drops exercises demanding more range than a joint has
    (e.g. {"knee": 110} keeps child's pose rock out for a knee capped at
    110° flexion... it demands 130°). Restrictive by design.
    """
    out = pool
    if pattern:
        out = [e for e in out if e.movement_pattern == pattern]
    if equipment:
        out = [e for e in out if e.equipment in equipment]
    if position:
        out = [e for e in out if e.position == position]
    if tier:
        out = [e for e in out if e.intensity_tier == tier]
    if max_impact:
        ceiling = IMPACT_ORDER.index(max_impact)
        out = [e for e in out if IMPACT_ORDER.index(e.impact_level) <= ceiling]
    if exclude_flags:
        banned = set(exclude_flags)
        if "axial_loading" in banned:
            out = [e for e in out if not e.axial_load]
        if "high_impact" in banned:
            out = [e for e in out if e.impact_level != "high"]
        out = [e for e in out if not banned.intersection(e.flags)]
    if no_axial_load:
        out = [e for e in out if not e.axial_load]
    if wheelchair_only:
        out = [e for e in out if e.wheelchair_ok]
    if exclude_regions:
        dropped = set(exclude_regions)
        out = [e for e in out if not dropped.intersection(e.joints_loaded)]
    if rom_limits:
        out = [
            e
            for e in out
            if all(
                e.rom_demand.get(joint, 0) <= limit
                for joint, limit in rom_limits.items()
            )
        ]
    return out
