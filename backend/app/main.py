"""FastAPI app factory with lifespan, CORS, and middleware."""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database import engine, Base
from app.routers import auth, stations, ingest, data, apikeys, billing

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("enviroswarm")

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Starting up ENViroSwarm API...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    logger.info("Shutting down ENViroSwarm API...")
    await engine.dispose()


app = FastAPI(
    title="ENViroSwarm API",
    description="Environmental sensor data SaaS API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "X-API-Key", "X-Idempotency-Key"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)


# API v1 routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(stations.router, prefix="/api/v1")
app.include_router(ingest.router, prefix="/api/v1")
app.include_router(data.router, prefix="/api/v1")
app.include_router(apikeys.router, prefix="/api/v1")
app.include_router(billing.router, prefix="/api/v1")


# Health check (must be at /api/v1/health for load balancers)
@app.get("/api/v1/health", tags=["health"])
async def health() -> dict:
    return {"success": True, "data": {"status": "ok", "version": "1.0.0"}}


# Global exception handler — never leak internal details in production
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    if settings.is_production:
        return JSONResponse(
            status_code=500,
            content={"success": False, "data": None, "error": "Internal server error"},
        )
    return JSONResponse(
        status_code=500,
        content={"success": False, "data": None, "error": str(exc)},
    )
