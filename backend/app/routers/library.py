from fastapi import APIRouter, HTTPException, Query

from app.data.library import Exercise, exercises, filter_exercises, vocabulary

router = APIRouter(tags=["library"])


@router.get("/vocabulary")
def get_vocabulary() -> dict[str, list[str]]:
    return vocabulary()


@router.get("/exercises")
def list_exercises(
    pattern: str | None = None,
    equipment: list[str] | None = Query(default=None),
    position: str | None = None,
    tier: str | None = None,
    max_impact: str | None = None,
    exclude_flags: list[str] | None = Query(default=None),
    no_axial_load: bool = False,
    wheelchair_only: bool = False,
) -> dict:
    voc = vocabulary()
    if pattern and pattern not in voc["movement_pattern"]:
        raise HTTPException(422, f"unknown pattern {pattern!r}")
    if max_impact and max_impact not in voc["impact_level"]:
        raise HTTPException(422, f"unknown impact level {max_impact!r}")
    result = filter_exercises(
        exercises(),
        pattern=pattern,
        equipment=equipment,
        position=position,
        tier=tier,
        max_impact=max_impact,
        exclude_flags=exclude_flags,
        no_axial_load=no_axial_load,
        wheelchair_only=wheelchair_only,
    )
    return {"count": len(result), "exercises": result}


@router.get("/exercises/{slug}")
def get_exercise(slug: str) -> Exercise:
    for e in exercises():
        if e.slug == slug:
            return e
    raise HTTPException(404, f"no exercise {slug!r}")
