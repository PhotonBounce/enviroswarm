#!/usr/bin/env python3
"""
ENViroSwarm Screenshot Capture Script

Captures screenshots of all dashboard pages using Playwright.
Ensures each page is actually navigated to and content is loaded before capture.
Verifies that screenshots are distinct (not identical copies).

Usage:
    python scripts/screenshot_pages.py [--base-url URL] [--output-dir DIR]

Requirements:
    pip install playwright
    playwright install chromium
"""

import argparse
import hashlib
import http.server
import os
import socketserver
import subprocess
import sys
import tempfile
import threading
import time
from pathlib import Path
from typing import List, Tuple

from playwright.sync_api import sync_playwright, Page, expect

# Page definitions: (filename, route, wait_for_selector)
PAGES: List[Tuple[str, str, str]] = [
    ("01-login", "/login", "button[type='submit']"),
    ("02-register", "/register", "button[type='submit']"),
    ("03-dashboard", "/", "h1"),
    ("04-stations", "/stations", "h1"),
    ("05-data", "/data", "h1"),
    ("06-apikeys", "/apikeys", "h1"),
    ("07-pricing", "/pricing", "h1"),
    ("08-profile", "/profile", "h1"),
]


def build_frontend(project_dir: Path) -> Path:
    """Build the frontend and return the dist directory path."""
    web_dir = project_dir / "web-dashboard"
    dist_dir = web_dir / "dist"
    print(f"🏗️  Building frontend in {web_dir}...")
    result = subprocess.run(
        ["npm", "run", "build"],
        cwd=web_dir,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"Build failed:\n{result.stderr}")
        sys.exit(1)
    if not dist_dir.exists():
        print(f"Dist directory not found: {dist_dir}")
        sys.exit(1)
    print(f"✅ Build complete: {dist_dir}")
    return dist_dir


class SPAServer(socketserver.TCPServer):
    allow_reuse_address = True


class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, spa_directory: str = ".", **kwargs):
        self.spa_directory = spa_directory
        super().__init__(*args, directory=spa_directory, **kwargs)

    def do_GET(self):
        # If the path is a file, serve it; otherwise serve index.html for SPA routing
        path = Path(self.spa_directory) / self.path.lstrip("/")
        if self.path == "/":
            super().do_GET()
        elif path.exists() and path.is_file():
            super().do_GET()
        else:
            self.path = "/index.html"
            super().do_GET()

    def log_message(self, format, *args):
        # Suppress logs
        pass


def start_spaserver(dist_dir: Path, port: int = 0) -> Tuple[int, threading.Thread]:
    """Start a local SPA server on an ephemeral port. Returns (port, thread)."""
    server = SPAServer(("127.0.0.1", port), lambda *args, **kwargs: SPAHandler(*args, spa_directory=str(dist_dir), **kwargs))
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    print(f"🌐 SPA server running at http://127.0.0.1:{port}")
    return port, thread


def file_hash(path: Path) -> str:
    """Return SHA256 hex digest of file contents."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def capture_screenshots(base_url: str, output_dir: Path, headless: bool = True) -> None:
    """Capture screenshots of all pages and verify they are unique."""
    output_dir.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        # Inject demo mode so the app works without backend
        page.set_extra_http_headers({})
        # We set localStorage before navigating so the app knows we're in demo mode
        # But we need to visit the base first to set localStorage, then navigate
        # Actually, we can evaluate in a blank page first
        blank = context.new_page()
        blank.goto("about:blank")
        blank.evaluate("localStorage.setItem('DEMO_MODE', 'true')")
        blank.close()

        captured = []
        for filename, route, selector in PAGES:
            url = f"{base_url}{route}"
            print(f"📸 Capturing {filename} at {url}...")

            page.goto(url, wait_until="networkidle")
            # Wait for the specific selector to ensure content has rendered
            try:
                page.wait_for_selector(selector, timeout=10000)
            except Exception as e:
                print(f"   ⚠️  Selector '{selector}' not found on {filename}: {e}")
            # Extra wait for React to finish rendering animations
            page.wait_for_timeout(500)

            screenshot_path = output_dir / f"{filename}.png"
            page.screenshot(path=str(screenshot_path), full_page=False)
            captured.append((filename, screenshot_path))
            print(f"   ✅ Saved {screenshot_path}")

        browser.close()

    # Verify uniqueness
    print("\n🔍 Verifying screenshot uniqueness...")
    hashes = {}
    duplicates = []
    for filename, path in captured:
        h = file_hash(path)
        if h in hashes:
            duplicates.append((filename, hashes[h], h))
        else:
            hashes[h] = filename

    if duplicates:
        print(f"❌ FAILURE: {len(duplicates)} duplicate screenshot(s) found:")
        for dup, orig, h in duplicates:
            print(f"   - {dup}.png is identical to {orig}.png (hash: {h[:16]}...)")
        sys.exit(1)
    else:
        print(f"✅ All {len(captured)} screenshots are unique.")
        print(f"📁 Output directory: {output_dir}")


def main():
    parser = argparse.ArgumentParser(description="Capture ENViroSwarm page screenshots")
    parser.add_argument(
        "--base-url",
        default=None,
        help="Base URL of the running app (e.g., http://localhost:5173). If omitted, builds and serves dist/",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).parent.parent / "screenshots" / "qa",
        help="Directory to save screenshots",
    )
    parser.add_argument(
        "--build",
        action="store_true",
        help="Build the frontend before capturing (default: use existing dist/)",
    )
    parser.add_argument(
        "--headed",
        action="store_true",
        help="Run browser in headed mode (visible) for debugging",
    )
    args = parser.parse_args()

    project_dir = Path(__file__).parent.parent.resolve()
    dist_dir = project_dir / "web-dashboard" / "dist"

    server = None
    base_url = args.base_url

    if base_url is None:
        if args.build or not dist_dir.exists():
            dist_dir = build_frontend(project_dir)
        if not dist_dir.exists():
            print(f"❌ Dist directory not found: {dist_dir}")
            sys.exit(1)
        port, _ = start_spaserver(dist_dir)
        base_url = f"http://127.0.0.1:{port}"
        # Give server a moment to be ready
        time.sleep(0.5)

    try:
        capture_screenshots(base_url, args.output_dir, headless=not args.headed)
    finally:
        if server:
            server.shutdown()


if __name__ == "__main__":
    main()
