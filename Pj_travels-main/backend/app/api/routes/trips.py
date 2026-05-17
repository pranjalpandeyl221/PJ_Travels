from __future__ import annotations

import json as _json
import logging
import traceback
from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import ValidationError

from app.core.config import get_settings
from app.models.schemas import TravelPlanRequest, TravelPlanResponse
from app.services.llm import GroqLLM
from app.services.planner import TravelPlannerService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/trips", tags=["trips"])


@lru_cache(maxsize=1)
def get_travel_planner_service() -> TravelPlannerService:
    settings = get_settings()
    llm = GroqLLM(settings)
    return TravelPlannerService(llm)


@router.post("/plan", response_model=TravelPlanResponse)
def create_travel_plan(
    payload: TravelPlanRequest,
    planner: TravelPlannerService = Depends(get_travel_planner_service),
) -> TravelPlanResponse:
    session_id = payload.session_id or "new"
    logger.info("Plan request: session=%s request=%r", session_id, payload.user_request)
    try:
        result = planner.plan_trip(payload)
        if result.final_plan:
            logger.info(
                "Plan success: session=%s dest=%s budget=%.0f",
                result.session_id,
                result.final_plan.intent.destination,
                result.final_plan.budget.total_estimated_cost,
            )
        elif result.questions:
            logger.info("Clarification needed: session=%s qns=%d", result.session_id, len(result.questions))
        return result
    except ValidationError as exc:
        logger.warning("Validation error: session=%s error=%s", session_id, exc)
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        tb = traceback.format_exc()
        logger.error("Planning failed: session=%s error=%s\n%s", session_id, exc, tb)
        raise HTTPException(
            status_code=500,
            detail=f"Planning failed: {exc}",
        )


@router.post("/plan/stream")
def create_travel_plan_stream(
    payload: TravelPlanRequest,
    planner: TravelPlannerService = Depends(get_travel_planner_service),
):
    session_id = payload.session_id or "new"
    logger.info("Stream plan request: session=%s request=%r", session_id, payload.user_request)

    def event_generator():
        try:
            for event in planner.plan_trip_stream(payload):
                yield f"data: {_json.dumps(event, default=str)}\n\n"
        except Exception as exc:
            tb = traceback.format_exc()
            logger.error("Stream plan failed: session=%s error=%s\n%s", session_id, exc, tb)
            yield f"data: {_json.dumps({'type': 'error', 'data': str(exc)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
