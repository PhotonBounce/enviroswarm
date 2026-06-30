#!/usr/bin/env python3
"""ENViroSwarm Demo Data Seeder

Usage:
    python seed_demo.py              # Full run (requires backend on localhost:8000)
    python seed_demo.py --dry-run    # Generate data without API calls
    python seed_demo.py --cleanup    # Delete existing demo stations before seeding
    python seed_demo.py --help       # Show options
"""

import argparse
import gzip
import json
import os
import random
import sys
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional

import requests
from urllib3.util.retry import Retry
from requests.adapters import HTTPAdapter

from generators.station_factory import create_stations
from generators.reading_generator import generate_all_readings

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
API_BASE = "http://localhost:8000"
DEMO_EMAIL = "demo@enviroswarm.local"
DEMO_PASSWORD = "Demo12345!"
DEMO_TIER = "enterprise"

TOTAL_STATIONS = 30
DAYS_OF_HISTORY = 30
INTERVAL_MINUTES = 15
MISSING_RATE = 0.03
OUTLIER_RATE = 0.01
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "500"))
BATCH_DELAY_SECONDS = float(os.getenv("BATCH_DELAY_SECONDS", "0.2"))
DEFAULT_INGEST_TIMEOUT = float(os.getenv("INGEST_TIMEOUT", "30"))

# ---------------------------------------------------------------------------
# HTTP Session with retries
# ---------------------------------------------------------------------------

def _make_session() -> requests.Session:
    session = requests.Session()
    retry_strategy = Retry(
        total=3,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["POST", "GET", "DELETE", "PATCH"],
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    session.headers.update({"User-Agent": "enviroswarm-seeder/1.0"})
    return session


def _api_url(path: str) -> str:
    return f"{API_BASE.rstrip('/')}/{path.lstrip('/')}"


def _unwrap(resp: requests.Response) -> Any:
    """Parse the backend's {success, data, error, meta} envelope."""
    try:
        body = resp.json()
    except Exception:
        body = {}
    if not body.get("success", True):
        err = body.get("error", f"HTTP {resp.status_code}")
        raise RuntimeError(f"API error: {err}")
    if resp.status_code >= 400:
        err = body.get("error", f"HTTP {resp.status_code}")
        raise RuntimeError(f"API error: {err}")
    return body.get("data", body)


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------

def register_user(session: requests.Session, email: str, password: str) -> Optional[Dict[str, Any]]:
    """Register a new demo user."""
    resp = session.post(
        _api_url("/api/v1/auth/register"),
        json={"email": email, "password": password},
        timeout=10,
    )
    if resp.status_code == 409:
        print(f"  User {email} already exists.")
        return None
    resp.raise_for_status()
    return _unwrap(resp)


def login_user(session: requests.Session, email: str, password: str) -> str:
    """Login and return JWT access token."""
    resp = session.post(
        _api_url("/api/v1/auth/login"),
        json={"email": email, "password": password},
        timeout=10,
    )
    resp.raise_for_status()
    data = _unwrap(resp)
    token = data.get("access_token") if isinstance(data, dict) else None
    if not token:
        raise RuntimeError("Login response did not contain access_token")
    return token


def get_user_me(session: requests.Session, token: str) -> Dict[str, Any]:
    """Get current user info (including tier)."""
    resp = session.get(
        _api_url("/api/v1/auth/me"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    resp.raise_for_status()
    return _unwrap(resp)


def get_pricing(session: requests.Session) -> List[Dict[str, Any]]:
    """Query backend pricing tiers dynamically."""
    resp = session.get(
        _api_url("/api/v1/pricing"),
        timeout=10,
    )
    resp.raise_for_status()
    data = _unwrap(resp)
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and "data" in data:
        return data["data"]
    return []


def _station_limit_from_pricing(pricing: List[Dict[str, Any]], tier: str) -> int:
    """Extract station limit for a given tier from pricing data."""
    for item in pricing:
        if isinstance(item, dict) and item.get("name") == tier:
            return item.get("stations", 1)
    return 1


def subscribe_user(session: requests.Session, token: str, tier: str, duration_months: int = 1) -> Dict[str, Any]:
    """Upgrade user tier via the billing API."""
    resp = session.post(
        _api_url("/api/v1/subscribe"),
        json={"tier": tier, "duration_months": duration_months},
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    resp.raise_for_status()
    return _unwrap(resp)


# ---------------------------------------------------------------------------
# Station helpers
# ---------------------------------------------------------------------------

def list_stations(session: requests.Session, token: str) -> List[Dict[str, Any]]:
    """List all stations for the authenticated user."""
    stations: List[Dict[str, Any]] = []
    offset = 0
    limit = 100
    while True:
        resp = session.get(
            _api_url("/api/v1/stations"),
            params={"limit": limit, "offset": offset},
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        resp.raise_for_status()
        body = resp.json()
        if not body.get("success", True):
            err = body.get("error", f"HTTP {resp.status_code}")
            raise RuntimeError(f"API error: {err}")

        data = body.get("data", [])
        if not isinstance(data, list) or not data:
            break
        stations.extend(data)
        meta = body.get("meta", {})
        total = meta.get("total", 0)
        if offset + limit >= total:
            break
        offset += limit
    return stations


def delete_station(session: requests.Session, token: str, station_id: str) -> None:
    """Soft-delete a station."""
    resp = session.delete(
        _api_url(f"/api/v1/stations/{station_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    resp.raise_for_status()


def create_station_api(session: requests.Session, token: str, station: Dict[str, Any]) -> Dict[str, Any]:
    """Create a station via the backend API."""
    payload = {
        "name": station["name"],
        "latitude": station["latitude"],
        "longitude": station["longitude"],
        "sensor_types": station["sensor_types"],
        "status": station.get("status", "active"),
    }
    resp = session.post(
        _api_url("/api/v1/stations"),
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    resp.raise_for_status()
    return _unwrap(resp)


# ---------------------------------------------------------------------------
# Ingest helper
# ---------------------------------------------------------------------------

def _ingest_with_payload(
    session: requests.Session,
    token: str,
    payload: Dict[str, Any],
    ingest_timeout: float,
) -> requests.Response:
    """POST a pre-built ingest payload with gzip and idempotency."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "X-Idempotency-Key": str(uuid.uuid4()),
    }
    raw_json = json.dumps(payload).encode("utf-8")
    compressed = gzip.compress(raw_json)
    headers["Content-Encoding"] = "gzip"
    return session.post(
        _api_url("/api/v1/ingest"),
        data=compressed,
        headers=headers,
        timeout=ingest_timeout,
    )


def ingest_bulk(
    session: requests.Session,
    token: str,
    readings: List[Dict[str, Any]],
    ingest_timeout: float = DEFAULT_INGEST_TIMEOUT,
) -> Dict[str, Any]:
    """Submit a batch of readings to the ingest API.

    Handles 413 Payload Too Large by splitting the batch in half and retrying.
    """
    if not readings:
        return {"inserted": 0}

    payload = {"readings": readings}
    resp = _ingest_with_payload(session, token, payload, ingest_timeout)

    if resp.status_code == 413:
        if len(readings) == 1:
            # Cannot split further
            raise RuntimeError(
                f"413 Payload Too Large even for a single reading. "
                f"Body sample: {json.dumps(payload)[:500]}"
            )
        mid = len(readings) // 2
        first = ingest_bulk(session, token, readings[:mid], ingest_timeout)
        second = ingest_bulk(session, token, readings[mid:], ingest_timeout)
        inserted = 0
        for part in (first, second):
            if isinstance(part, dict):
                inserted += part.get("inserted", 0)
        return {"inserted": inserted}

    if resp.status_code >= 400:
        sample = json.dumps(payload)[:500]
        raise RuntimeError(f"HTTP {resp.status_code}: {resp.text[:200]} | body sample: {sample}")

    resp.raise_for_status()
    return _unwrap(resp)


# ---------------------------------------------------------------------------
# Demo Flow
# ---------------------------------------------------------------------------

def run_seed(
    dry_run: bool = False,
    api_base: Optional[str] = None,
    cleanup: bool = False,
    stations: int = TOTAL_STATIONS,
    days: int = DAYS_OF_HISTORY,
    batch_size: int = BATCH_SIZE,
    batch_delay: float = BATCH_DELAY_SECONDS,
    ingest_timeout: float = DEFAULT_INGEST_TIMEOUT,
    wait_for_backend: bool = False,
) -> Dict[str, Any]:
    """Execute the full demo seeding pipeline.

    Returns a summary dict with counts and timing.
    """
    global API_BASE
    if api_base:
        API_BASE = api_base

    start_time = time.time()
    summary = {
        "dry_run": dry_run,
        "api_base": API_BASE,
        "stations_created": 0,
        "readings_generated": 0,
        "batches_sent": 0,
        "api_errors": 0,
        "elapsed_seconds": 0.0,
    }

    if batch_size <= 0:
        raise ValueError("batch_size must be > 0")

    # ------------------------------------------------------------------
    # 1. Auth
    # ------------------------------------------------------------------
    if not dry_run:
        print("=" * 60)
        print("ENViroSwarm Demo Data Seeder")
        print("=" * 60)

        session = _make_session()

        if wait_for_backend:
            print("\n[0/6] Waiting for backend to become available...")
            deadline = time.monotonic() + 60.0
            while time.monotonic() < deadline:
                try:
                    probe = session.get(_api_url("/api/v1/pricing"), timeout=5)
                    if probe.status_code < 500:
                        print("  Backend is up.")
                        break
                except Exception:
                    pass
                time.sleep(1.0)
            else:
                print("  WARNING: Backend did not respond within 60s, continuing anyway...")

        print(f"\n[1/6] Registering demo user ({DEMO_EMAIL})...")
        try:
            register_user(session, DEMO_EMAIL, DEMO_PASSWORD)
        except Exception as e:
            print(f"  Registration note: {e}")

        print("[2/6] Logging in...")
        try:
            token = login_user(session, DEMO_EMAIL, DEMO_PASSWORD)
            print("  Authenticated successfully.")
        except Exception as e:
            print(f"  FATAL: Could not login: {e}")
            summary["api_errors"] += 1
            return summary

        print(f"[3/6] Upgrading tier to {DEMO_TIER}...")
        try:
            subscribe_user(session, token, DEMO_TIER, duration_months=1)
            print(f"  Tier upgraded to {DEMO_TIER}.")
        except Exception as e:
            print(f"  Tier upgrade note: {e}")
            # Fall back to querying current tier and pricing so we can adapt station count
            try:
                me = get_user_me(session, token)
                actual_tier = me.get("tier", "free")
                pricing = get_pricing(session)
                max_stations = _station_limit_from_pricing(pricing, actual_tier)
                if stations > max_stations:
                    print(f"  WARNING: Tier is '{actual_tier}', limiting stations to {max_stations}.")
                    stations = max_stations
            except Exception as me_err:
                print(f"  Could not determine tier: {me_err}")
                stations = 1

        # ------------------------------------------------------------------
        # 1b. Cleanup / idempotency
        # ------------------------------------------------------------------
        if cleanup:
            print("[4/6] Cleaning up existing demo stations...")
            try:
                existing = list_stations(session, token)
                for s in existing:
                    sid = s.get("id")
                    if sid:
                        try:
                            delete_station(session, token, sid)
                            print(f"  Deleted station {sid}")
                        except Exception as del_err:
                            print(f"  Could not delete {sid}: {del_err}")
            except Exception as e:
                print(f"  Cleanup note: {e}")
        else:
            # Check for existing stations to avoid duplicates
            try:
                existing = list_stations(session, token)
                if existing:
                    print(f"  Found {len(existing)} existing station(s). Skipping creation to avoid duplicates.")
                    print("  Use --cleanup to remove them first.")
                    # We can still generate readings for existing stations if desired,
                    # but for idempotency we will just stop here.
                    summary["stations_created"] = len(existing)
                    summary["readings_generated"] = 0
                    summary["elapsed_seconds"] = round(time.time() - start_time, 2)
                    print("\n" + "=" * 60)
                    print("SUMMARY")
                    print("=" * 60)
                    print(f"  Mode:          LIVE")
                    print(f"  API Base:      {API_BASE}")
                    print(f"  Stations:      {summary['stations_created']}")
                    print(f"  Readings:      0")
                    print(f"  Batches sent:  0")
                    print(f"  API errors:    {summary['api_errors']}")
                    print(f"  Elapsed:       {summary['elapsed_seconds']:.2f}s")
                    print("=" * 60)
                    return summary
            except Exception as e:
                print(f"  Existing station check note: {e}")
    else:
        print("=" * 60)
        print("ENViroSwarm Demo Data Seeder  —  DRY RUN")
        print("=" * 60)
        session = None
        token = "dry-run-token"

    # ------------------------------------------------------------------
    # 2. Create Stations
    # ------------------------------------------------------------------
    print(f"\n[5/6] Creating {stations} simulated stations...")
    local_stations = create_stations(total=stations)
    created_stations: List[Dict[str, Any]] = []

    for idx, station in enumerate(local_stations, 1):
        if dry_run:
            print(f"  [{idx}/{stations}] {station['name']}  lat={station['latitude']} lon={station['longitude']} sensors={station['sensor_types']}")
            created_stations.append(station)
        else:
            try:
                api_station = create_station_api(session, token, station)
                # Merge API response (which may contain real DB id) with our local data
                merged = {
                    **station,
                    "latitude": api_station.get("latitude"),
                    "longitude": api_station.get("longitude"),
                    "id": api_station.get("id", station["id"]),
                }
                created_stations.append(merged)
                print(f"  [{idx}/{stations}] Created: {merged['name']} (id={merged['id']})")
                summary["stations_created"] += 1
            except Exception as e:
                print(f"  [{idx}/{stations}] ERROR creating {station['name']}: {e}")
                summary["api_errors"] += 1
                # Do NOT add locally-fallback stations to created_stations
                # so we avoid sending readings for non-existent stations.

    # ------------------------------------------------------------------
    # 3. Generate Readings
    # ------------------------------------------------------------------
    print(f"\n[6/6] Generating {days} days of historical readings...")
    print(f"       Interval: {INTERVAL_MINUTES} minutes | Missing: {MISSING_RATE*100:.0f}% | Outliers: {OUTLIER_RATE*100:.0f}%")

    end_time = datetime.now(timezone.utc).replace(microsecond=0)
    readings = generate_all_readings(
        stations=created_stations,
        days=days,
        interval_minutes=INTERVAL_MINUTES,
        missing_rate=MISSING_RATE,
        outlier_rate=OUTLIER_RATE,
        end_time=end_time,
    )
    summary["readings_generated"] = len(readings)
    print(f"  Generated {len(readings):,} readings.")

    # ------------------------------------------------------------------
    # 4. Ingest in Batches
    # ------------------------------------------------------------------
    if not dry_run:
        print(f"\n[7/7] Submitting readings in batches of {batch_size}...")
        total_batches = (len(readings) + batch_size - 1) // batch_size
        adaptive_delay = batch_delay
        for i in range(0, len(readings), batch_size):
            batch = readings[i : i + batch_size]
            batch_num = (i // batch_size) + 1
            batch_start = time.monotonic()
            try:
                result = ingest_bulk(session, token, batch, ingest_timeout=ingest_timeout)
                summary["batches_sent"] += 1
                inserted = result.get("inserted", "?") if isinstance(result, dict) else "?"
                print(f"  Batch {batch_num}/{total_batches} ({len(batch)} readings) -> inserted={inserted}")
            except Exception as e:
                summary["api_errors"] += 1
                sample = json.dumps({"readings": batch[:2]})[:500]
                print(f"  Batch {batch_num}/{total_batches} -> ERROR: {e} | body sample: {sample}")

            # Adaptive rate-limiting: if request took > 2s, increase delay;
            # if request was fast, slowly decrease toward base delay.
            elapsed_req = time.monotonic() - batch_start
            if elapsed_req > 2.0:
                adaptive_delay = min(adaptive_delay * 1.5, 5.0)
            elif elapsed_req < 0.5 and adaptive_delay > batch_delay:
                adaptive_delay = max(adaptive_delay * 0.9, batch_delay)

            # Skip sleep after the final batch
            if batch_num < total_batches and adaptive_delay > 0:
                time.sleep(adaptive_delay)
    else:
        total_batches = (len(readings) + batch_size - 1) // batch_size
        print(f"\n[7/7] DRY RUN: skipping ingest. Would send {len(readings):,} readings in {total_batches} batches.")

    # ------------------------------------------------------------------
    # 5. Summary Stats
    # ------------------------------------------------------------------
    elapsed = time.time() - start_time
    summary["elapsed_seconds"] = round(elapsed, 2)

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"  Mode:          {'DRY RUN' if dry_run else 'LIVE'}")
    print(f"  API Base:      {API_BASE}")
    print(f"  Stations:      {summary['stations_created']}")
    print(f"  Readings:      {summary['readings_generated']:,}")
    print(f"  Batches sent:  {summary['batches_sent']}")
    print(f"  API errors:    {summary['api_errors']}")
    print(f"  Elapsed:       {summary['elapsed_seconds']:.2f}s")

    # Per-sensor breakdown
    sensor_counts = {}
    for r in readings:
        st = r["sensor_type"]
        sensor_counts[st] = sensor_counts.get(st, 0) + 1
    print("\n  Readings per sensor type:")
    for st in sorted(sensor_counts.keys()):
        print(f"    {st:<15} {sensor_counts[st]:>8,}")

    print("=" * 60)
    return summary


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="ENViroSwarm Demo Data Seeder")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Generate data but do not make any API calls.",
    )
    parser.add_argument(
        "--api-base",
        type=str,
        default="http://localhost:8000",
        help="Base URL of the backend API (default: http://localhost:8000)",
    )
    parser.add_argument(
        "--stations",
        type=int,
        default=TOTAL_STATIONS,
        help=f"Number of stations to create (default: {TOTAL_STATIONS})",
    )
    parser.add_argument(
        "--days",
        type=int,
        default=DAYS_OF_HISTORY,
        help=f"Days of history to generate (default: {DAYS_OF_HISTORY})",
    )
    parser.add_argument(
        "--cleanup",
        action="store_true",
        help="Delete existing demo stations before seeding.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=BATCH_SIZE,
        help=f"Ingest batch size (default: {BATCH_SIZE})",
    )
    parser.add_argument(
        "--batch-delay",
        type=float,
        default=BATCH_DELAY_SECONDS,
        help=f"Delay between ingest batches in seconds (default: {BATCH_DELAY_SECONDS})",
    )
    parser.add_argument(
        "--ingest-timeout",
        type=float,
        default=DEFAULT_INGEST_TIMEOUT,
        help=f"HTTP timeout per ingest request in seconds (default: {DEFAULT_INGEST_TIMEOUT})",
    )
    parser.add_argument(
        "--wait-for-backend",
        action="store_true",
        help="Poll backend until it responds before starting.",
    )
    args = parser.parse_args()

    summary = run_seed(
        dry_run=args.dry_run,
        api_base=args.api_base,
        cleanup=args.cleanup,
        stations=args.stations,
        days=args.days,
        batch_size=args.batch_size,
        batch_delay=args.batch_delay,
        ingest_timeout=args.ingest_timeout,
        wait_for_backend=args.wait_for_backend,
    )

    if summary.get("api_errors", 0) > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
