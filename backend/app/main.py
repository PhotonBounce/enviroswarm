"""FastAPI app factory with lifespan, CORS, and middleware."""

import logging
import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database import get_engine, Base
from app.routers import auth, stations, ingest, data, apikeys, billing

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("enviroswarm")

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Starting up ENViroSwarm API...")
    # NOTE: In production, use Alembic migrations (`alembic upgrade head`)
    # instead of create_all. create_all does not handle schema migrations,
    # renames, or data migrations.
    if settings.environment.lower() == "development":
        async with get_engine().begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    else:
        logger.warning(
            "PRODUCTION: Skipping Base.metadata.create_all. "
            "Run 'alembic upgrade head' in your Docker entrypoint."
        )

    # Cleanup stale revoked tokens, rate limit entries, and idempotency keys on startup
    try:
        from app.auth import cleanup_revoked_tokens
        from app.dependencies import cleanup_rate_limit_entries, cleanup_idempotency_keys
        await cleanup_revoked_tokens()
        await cleanup_rate_limit_entries()
        await cleanup_idempotency_keys()
    except Exception:
        logger.warning("Cleanup failed during startup", exc_info=True)

    yield
    logger.info("Shutting down ENViroSwarm API...")
    await get_engine().dispose()


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
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-API-Key", "X-Idempotency-Key"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)


# Request ID middleware for upstream correlation
@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID")
    if not request_id:
        request_id = str(uuid.uuid4())[:8]
    else:
        request_id = request_id[:64]
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


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
    """Return service health status, including a lightweight DB ping."""
    try:
        from sqlalchemy import text
        async with get_engine().connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"success": True, "data": {"status": "ok", "version": "1.0.0"}}
    except Exception as exc:
        logger.error("Health check DB ping failed: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="Database unavailable",
        )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "data": None, "error": exc.detail},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"success": False, "data": None, "error": exc.errors()},
    )


# Global exception handler — never leak internal details in production
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", str(uuid.uuid4())[:8])
    logger.error(
        "Unhandled exception: method=%s path=%s request_id=%s exc=%s",
        request.method,
        request.url.path,
        request_id,
        exc,
        exc_info=True,
    )
    if settings.is_production:
        response = JSONResponse(
            status_code=500,
            content={"success": False, "data": None, "error": "Internal server error"},
        )
    else:
        response = JSONResponse(
            status_code=500,
            content={"success": False, "data": None, "error": str(exc)},
        )
    response.headers["X-Request-ID"] = request_id
    return response
