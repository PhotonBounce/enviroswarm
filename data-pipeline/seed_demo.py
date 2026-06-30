#!/usr/bin/env python3
"""ENViroSwarm Demo Data Seeder

Usage:
    python seed_demo.py              # Full run (requires backend on localhost:8000)
    python seed_demo.py --dry-run    # Generate data without API calls
    python seed_demo.py --help       # Show options
"""

import argparse
import json
import random
import sys
import time
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

import requests

from generators.station_factory import create_stations
from generators.reading_generator import generate_all_readings

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
API_BASE = "http://localhost:8000"
DEMO_EMAIL = "demo@enviroswarm.local"
DEMO_PASSWORD = "demo12345"
DEMO_TIER = "enterprise"

TOTAL_STATIONS = 30
DAYS_OF_HISTORY = 30
INTERVAL_MINUTES = 15
MISSING_RATE = 0.03
OUTLIER_RATE = 0.01
BATCH_SIZE = 500
BATCH_DELAY_SECONDS = 0.2

# ---------------------------------------------------------------------------
# HTTP Helpers
# ---------------------------------------------------------------------------

def _api_url(path: str) -> str:
    return f"{API_BASE.rstrip('/')}/{path.lstrip('/')}"


def _unwrap(resp: requests.Response) -> Any:
    """Parse the backend's {success, data, error, meta} envelope."""
    try:
        body = resp.json()
    except Exception:
        body = {}
    if not body.get("success", False) and resp.status_code >= 400:
        err = body.get("error", f"HTTP {resp.status_code}")
        raise RuntimeError(f"API error: {err}")
    return body.get("data", body)


def register_user(email: str, password: str, tier: str = "free") -> Dict[str, Any]:
    """Register a new demo user."""
    resp = requests.post(
        _api_url("/api/v1/auth/register"),
        json={"email": email, "password": password, "tier": tier},
        timeout=10,
    )
    if resp.status_code == 409:
        print(f"  User {email} already exists.")
        return None
    resp.raise_for_status()
    return _unwrap(resp)


def login_user(email: str, password: str) -> str:
    """Login and return JWT access token."""
    resp = requests.post(
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


def create_station_api(token: str, station: Dict[str, Any]) -> Dict[str, Any]:
    """Create a station via the backend API."""
    payload = {
        "name": station["name"],
        "lat": station["lat"],
        "lon": station["lon"],
        "sensor_types": station["sensor_types"],
        "status": station.get("status", "active"),
    }
    resp = requests.post(
        _api_url("/api/v1/stations"),
        json=payload,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        timeout=10,
    )
    resp.raise_for_status()
    return _unwrap(resp)


def ingest_bulk(token: str, readings: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Submit a batch of readings to the ingest API."""
    resp = requests.post(
        _api_url("/api/v1/ingest"),
        json=readings,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        timeout=30,
    )
    resp.raise_for_status()
    return _unwrap(resp)


# ---------------------------------------------------------------------------
# Demo Flow
# ---------------------------------------------------------------------------

def run_seed(dry_run: bool = False, api_base: Optional[str] = None) -> Dict[str, Any]:
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

    # ------------------------------------------------------------------
    # 1. Auth
    # ------------------------------------------------------------------
    if not dry_run:
        print("=" * 60)
        print("ENViroSwarm Demo Data Seeder")
        print("=" * 60)
        print(f"\n[1/5] Registering demo user ({DEMO_EMAIL})...")
        try:
            register_user(DEMO_EMAIL, DEMO_PASSWORD, tier=DEMO_TIER)
        except Exception as e:
            print(f"  Registration note: {e}")

        print(f"[2/5] Logging in...")
        try:
            token = login_user(DEMO_EMAIL, DEMO_PASSWORD)
            print(f"  Got JWT token (prefix: {token[:20]}...)")
        except Exception as e:
            print(f"  FATAL: Could not login: {e}")
            summary["api_errors"] += 1
            return summary
    else:
        print("=" * 60)
        print("ENViroSwarm Demo Data Seeder  —  DRY RUN")
        print("=" * 60)
        token = "dry-run-token"

    # ------------------------------------------------------------------
    # 2. Create Stations
    # ------------------------------------------------------------------
    print(f"\n[3/5] Creating {TOTAL_STATIONS} simulated stations...")
    stations = create_stations(total=TOTAL_STATIONS)
    created_stations = []

    for idx, station in enumerate(stations, 1):
        if dry_run:
            print(f"  [{idx}/{TOTAL_STATIONS}] {station['name']}  lat={station['lat']} lon={station['lon']} sensors={station['sensor_types']}")
            created_stations.append(station)
        else:
            try:
                api_station = create_station_api(token, station)
                # Merge API response (which may contain real DB id) with our local data
                merged = {**station, **api_station}
                merged["id"] = api_station.get("id", station["id"])
                created_stations.append(merged)
                print(f"  [{idx}/{TOTAL_STATIONS}] Created: {merged['name']} (id={merged['id']})")
            except Exception as e:
                print(f"  [{idx}/{TOTAL_STATIONS}] ERROR creating {station['name']}: {e}")
                summary["api_errors"] += 1
                # Fall back to local station so we can continue generating data
                created_stations.append(station)

    summary["stations_created"] = len(created_stations)

    # ------------------------------------------------------------------
    # 3. Generate Readings
    # ------------------------------------------------------------------
    print(f"\n[4/5] Generating {DAYS_OF_HISTORY} days of historical readings...")
    print(f"       Interval: {INTERVAL_MINUTES} minutes | Missing: {MISSING_RATE*100:.0f}% | Outliers: {OUTLIER_RATE*100:.0f}%")

    readings = generate_all_readings(
        stations=created_stations,
        days=DAYS_OF_HISTORY,
        interval_minutes=INTERVAL_MINUTES,
        missing_rate=MISSING_RATE,
        outlier_rate=OUTLIER_RATE,
        end_time=datetime.now(timezone.utc),
    )
    summary["readings_generated"] = len(readings)
    print(f"  Generated {len(readings):,} readings.")

    # ------------------------------------------------------------------
    # 4. Ingest in Batches
    # ------------------------------------------------------------------
    if not dry_run:
        print(f"\n[5/5] Submitting readings in batches of {BATCH_SIZE}...")
        total_batches = (len(readings) + BATCH_SIZE - 1) // BATCH_SIZE
        for i in range(0, len(readings), BATCH_SIZE):
            batch = readings[i : i + BATCH_SIZE]
            batch_num = (i // BATCH_SIZE) + 1
            try:
                ingest_bulk(token, batch)
                summary["batches_sent"] += 1
                print(f"  Batch {batch_num}/{total_batches} ({len(batch)} readings) -> OK")
            except Exception as e:
                summary["api_errors"] += 1
                print(f"  Batch {batch_num}/{total_batches} -> ERROR: {e}")
            time.sleep(BATCH_DELAY_SECONDS)
    else:
        print(f"\n[5/5] DRY RUN: skipping ingest. Would send {len(readings):,} readings in {(len(readings) + BATCH_SIZE - 1) // BATCH_SIZE} batches.")

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
    args = parser.parse_args()

    global TOTAL_STATIONS, DAYS_OF_HISTORY
    TOTAL_STATIONS = args.stations
    DAYS_OF_HISTORY = args.days

    run_seed(dry_run=args.dry_run, api_base=args.api_base)


if __name__ == "__main__":
    main()
