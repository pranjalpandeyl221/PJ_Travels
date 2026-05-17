from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.trips import router as trips_router
from app.core.config import get_settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

settings = get_settings()
logger.info("Starting %s v%s (%s)", settings.app_name, settings.app_version, settings.app_env)

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(trips_router)


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok", "environment": settings.app_env}
