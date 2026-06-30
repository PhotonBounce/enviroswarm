"""FastAPI app factory with lifespan, CORS, and middleware."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import engine, Base
from app.routers import auth, stations, ingest, data, apikeys, billing

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # shutdown
    await engine.dispose()


app = FastAPI(
    title="ENViroSwarm API",
    description="Environmental sensor data SaaS API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware)


# Health check
@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


# API v1 routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(stations.router, prefix="/api/v1")
app.include_router(ingest.router, prefix="/api/v1")
app.include_router(data.router, prefix="/api/v1")
app.include_router(apikeys.router, prefix="/api/v1")
app.include_router(billing.router, prefix="/api/v1")


# Global exception handler for consistent responses
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"success": False, "data": None, "error": str(exc)},
    )
