"""Crypto helpers shared across modules."""

import hashlib


def hash_key(raw_key: str) -> str:
    """SHA-256 hash of a raw API key."""
    return hashlib.sha256(raw_key.encode()).hexdigest()


def extract_prefix(raw_key: str) -> str:
    """First 8 chars of the key as prefix for fast lookup."""
    return raw_key[:8].lower()
