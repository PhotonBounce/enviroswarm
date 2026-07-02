"""Shared utilities for the data-pipeline package."""

import os


def _safe_int(env_var: str, default: int) -> int:
    try:
        return int(os.getenv(env_var, str(default)))
    except (ValueError, TypeError):
        return default


def _safe_float(env_var: str, default: float) -> float:
    try:
        return float(os.getenv(env_var, str(default)))
    except (ValueError, TypeError):
        return default
