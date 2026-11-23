#!/usr/bin/env python3
"""Zero-dependency E2E test orchestrator for the Pitt ISP Website Redesign.

Serves the static site on an ephemeral 127.0.0.1 dual-mount HTTP server
(mounted at both / and /ISP-Website-Redesign/), supervises an isolated headless
Chromium 156 instance, executes Node 24 E2E test tiers via node:test, enforces
strict TAP pass/non-zero-test exit codes, and guarantees clean teardown.
"""

from __future__ import annotations

import argparse
import functools
import http.server
import os
import pathlib
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import threading
import time
import urllib.parse

SUBPATH_PREFIX = "/ISP-Website-Redesign"

TIER_MAP: dict[str, list[str]] = {
    "self": ["self_check.test.mjs"],
    "1": ["tier1_features.test.mjs"],
    "2": ["tier2_boundaries.test.mjs"],
    "3": ["tier3_combinations.test.mjs"],
    "4": ["tier4_scenarios.test.mjs"],
    "all": [
        "tier1_features.test.mjs",
        "tier2_boundaries.test.mjs",
        "tier3_combinations.test.mjs",
        "tier4_scenarios.test.mjs",
    ],
}

DEVTOOLS_STDERR_RE = re.compile(
    r"DevTools listening on (ws://127\.0\.0\.1:\d+/devtools/browser/[^\s]+)"
)
TAP_CASE_RE = re.compile(r"^(\s*)(ok|not ok)\s+\d+\s+-\s+(.*)$")
TAP_SUMMARY_RE = re.compile(
    r"^#\s+(tests|suites|pass|fail|cancelled|skipped|todo)\s+(\d+)\s*$"
)
TAP_DIRECTIVE_RE = re.compile(r"\s+#\s+(?:SKIP|TODO)\b.*$", re.IGNORECASE)


class DualMountHTTPServer(http.server.ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True


class DualMountRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Serves a directory at both / and /ISP-Website-Redesign/."""

    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".mjs": "application/javascript",
        ".js": "application/javascript",
        ".json": "application/json",
        ".css": "text/css",
        ".html": "text/html; charset=utf-8",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".ico": "image/x-icon",
    }

    def _handle_missing_favicon(self) -> bool:
        req_path = urllib.parse.urlsplit(self.path).path
        if req_path in ("/favicon.ico", f"{SUBPATH_PREFIX}/favicon.ico"):
            favicon_path = pathlib.Path(self.directory) / "favicon.ico"
            if not favicon_path.is_file():
                self.send_response(204, "No Content")
                self.send_header("Content-Length", "0")
                self.end_headers()
                return True
        return False

    def do_GET(self) -> None:
        if self._handle_missing_favicon():
            return
        super().do_GET()

    def do_HEAD(self) -> None:
        if self._handle_missing_favicon():
            return
        super().do_HEAD()

    def translate_path(self, path: str) -> str:
        parts = urllib.parse.urlsplit(path)
        req_path = parts.path
        if req_path == SUBPATH_PREFIX:
            stripped = "/"
        elif req_path.startswith(SUBPATH_PREFIX + "/"):
            stripped = req_path[len(SUBPATH_PREFIX) :]
        else:
            stripped = req_path
        rebuilt = urllib.parse.urlunsplit(("", "", stripped, parts.query, ""))
        return super().translate_path(rebuilt)

    def log_message(self, format: str, *args: object) -> None:
        # Quiet access logging during automated test runs.
        return


def find_chromium_binary() -> str | None:
    candidates = [
        "/usr/bin/chromium",
        "/usr/bin/google-chrome",
        shutil.which("chromium"),
        shutil.which("google-chrome"),
    ]
    for candidate in candidates:
        if candidate and os.path.isfile(candidate) and os.access(candidate, os.X_OK):
            return candidate
    return None


def find_node_binary() -> str | None:
    candidates = [
        shutil.which("node"),
        "/usr/local/bin/node",
        "/usr/bin/node",
    ]
    for candidate in candidates:
        if candidate and os.path.isfile(candidate) and os.access(candidate, os.X_OK):
            return candidate
    return None


def resolve_site_dir(repo_root: pathlib.Path, explicit_root: str | None) -> pathlib.Path:
    if explicit_root is not None:
        root_path = pathlib.Path(explicit_root)
        if not root_path.is_absolute():
            root_path = (pathlib.Path.cwd() / root_path).resolve()
        if not root_path.exists() or not root_path.is_dir():
            raise FileNotFoundError(
                f"ERROR: Explicit --root directory does not exist: {root_path}"
            )
        return root_path

    dist_dir = repo_root / "redesign" / "dist"
    if (dist_dir / "index.html").is_file():
        return dist_dir.resolve()

    fallback_dir = repo_root / "redesign"
    if fallback_dir.is_dir():
        return fallback_dir.resolve()

    raise FileNotFoundError(
        f"ERROR: Could not locate site directory at {dist_dir} or {fallback_dir}"
    )


def read_stderr_tail(stderr_log_path: pathlib.Path, max_lines: int = 40) -> str:
    try:
        text = stderr_log_path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return "(unable to read chromium.stderr.log)"
    lines = text.splitlines()
    return "\n".join(lines[-max_lines:]) if lines else "(empty stderr log)"


def discover_ws_url(
    chromium_proc: subprocess.Popen[bytes],
    profile_dir: pathlib.Path,
    stderr_log_path: pathlib.Path,
    timeout_s: float = 15.0,
) -> str:
    active_port_file = profile_dir / "DevToolsActivePort"
    deadline = time.monotonic() + timeout_s

    while time.monotonic() < deadline:
        rc = chromium_proc.poll()
        if rc is not None:
            tail = read_stderr_tail(stderr_log_path)
            raise RuntimeError(
                f"Chromium exited prematurely with code {rc} before opening DevTools.\n"
                f"--- chromium.stderr.log (tail) ---\n{tail}"
            )

        if active_port_file.is_file():
            try:
                content = active_port_file.read_text(encoding="utf-8", errors="replace")
                lines = [line.strip() for line in content.splitlines() if line.strip()]
                if (
                    len(lines) >= 2
                    and lines[0].isdigit()
                    and lines[1].startswith("/devtools/")
                ):
                    return f"ws://127.0.0.1:{lines[0]}{lines[1]}"
            except OSError:
                pass

        if stderr_log_path.is_file():
            try:
                stderr_text = stderr_log_path.read_text(
                    encoding="utf-8", errors="replace"
                )
                match = DEVTOOLS_STDERR_RE.search(stderr_text)
                if match:
                    return match.group(1)
            except OSError:
                pass

        time.sleep(0.05)

    tail = read_stderr_tail(stderr_log_path)
    raise TimeoutError(
        f"Timed out after {timeout_s:.1f}s waiting for Chromium DevToolsActivePort.\n"
        f"--- chromium.stderr.log (tail) ---\n{tail}"
    )


def parse_tap_results(
    tap_path: pathlib.Path,
    selected_files: list[pathlib.Path],
    repo_root: pathlib.Path,
) -> dict[str, object]:
    if not tap_path.is_file():
        return {
            "summary_found": False,
            "tests": 0,
            "pass": 0,
            "fail": 0,
            "cancelled": 0,
            "skipped": 0,
            "todo": 0,
            "real_tests": 0,
            "error": f"TAP report not found at {tap_path}",
        }

    lines = tap_path.read_text(encoding="utf-8", errors="replace").splitlines()
    raw_file_identifiers: set[str] = set()
    for path in selected_files:
        raw_file_identifiers.add(str(path))
        raw_file_identifiers.add(str(path.resolve()))
        raw_file_identifiers.add(path.name)
        try:
            raw_file_identifiers.add(str(path.resolve().relative_to(repo_root.resolve())))
        except ValueError:
            pass

    summary: dict[str, int] = {}
    real_tests = 0

    idx = 0
    total_lines = len(lines)
    while idx < total_lines:
        line = lines[idx]

        sm = TAP_SUMMARY_RE.match(line)
        if sm:
            summary[sm.group(1)] = int(sm.group(2))
            idx += 1
            continue

        cm = TAP_CASE_RE.match(line)
        if cm:
            indent, _status, raw_name = cm.groups()
            name = TAP_DIRECTIVE_RE.sub("", raw_name).strip()

            entry_type: str | None = None
            look = idx + 1
            if look < total_lines and lines[look].strip() == "---":
                look += 1
                while look < total_lines and lines[look].strip() != "...":
                    stripped = lines[look].strip()
                    if stripped.startswith("type:"):
                        entry_type = stripped.split(":", 1)[1].strip().strip("'\"")
                    look += 1
                idx = look + 1 if look < total_lines else total_lines
            else:
                idx += 1

            if entry_type == "suite":
                continue

            is_phantom_file_entry = (
                len(indent) == 0
                and (name in raw_file_identifiers or name.endswith(".test.mjs"))
            )
            if not is_phantom_file_entry:
                real_tests += 1
            continue

        idx += 1

    required_keys = ("tests", "pass", "fail", "cancelled", "skipped", "todo")
    summary_found = all(key in summary for key in required_keys)

    return {
        "summary_found": summary_found,
        "tests": summary.get("tests", 0),
        "pass": summary.get("pass", 0),
        "fail": summary.get("fail", 0),
        "cancelled": summary.get("cancelled", 0),
        "skipped": summary.get("skipped", 0),
        "todo": summary.get("todo", 0),
        "real_tests": real_tests,
        "error": None if summary_found else "Incomplete TAP summary block",
    }


def terminate_node_process(node_proc: subprocess.Popen[bytes] | None) -> None:
    if node_proc is None or node_proc.poll() is not None:
        return
    try:
        node_proc.terminate()
        node_proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        try:
            node_proc.kill()
            node_proc.wait(timeout=2)
        except OSError:
            pass
    except OSError:
        pass


def terminate_chromium_process(
    chromium_proc: subprocess.Popen[bytes] | None,
    chromium_pgid: int | None,
) -> None:
    if chromium_proc is None:
        return

    if chromium_proc.poll() is None:
        try:
            chromium_proc.terminate()
        except OSError:
            pass
        try:
            chromium_proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            if chromium_pgid is not None:
                try:
                    os.killpg(chromium_pgid, signal.SIGTERM)
                except OSError:
                    pass
            try:
                chromium_proc.wait(timeout=2)
            except subprocess.TimeoutExpired:
                if chromium_pgid is not None:
                    try:
                        os.killpg(chromium_pgid, signal.SIGKILL)
                    except OSError:
                        pass
                try:
                    chromium_proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    pass

    # Safety sweep in case any child in the Chromium session group lingered.
    if chromium_pgid is not None:
        try:
            os.killpg(chromium_pgid, signal.SIGTERM)
        except OSError:
            pass


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run zero-dependency headless Chromium E2E tests for Pitt ISP Redesign."
    )
    parser.add_argument(
        "--tier",
        choices=("1", "2", "3", "4", "all", "self"),
        default="all",
        help="Select test tier to run (default: all).",
    )
    parser.add_argument(
        "--root",
        default=None,
        help="Override static site directory (default: redesign/dist if built, else redesign).",
    )
    parser.add_argument(
        "--filter",
        default=None,
        help="Optional Node --test-name-pattern filter.",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=300.0,
        help="Maximum seconds allowed for the Node test invocation (default: 300).",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(sys.argv[1:] if argv is None else argv)

    if args.timeout <= 0:
        print("ERROR: --timeout must be a positive number.", file=sys.stderr)
        return 2

    tests_dir = pathlib.Path(__file__).resolve().parent
    repo_root = tests_dir.parent.parent.resolve()

    # Pre-flight 1: Verify site directory exists before launching anything.
    try:
        site_dir = resolve_site_dir(repo_root, args.root)
    except FileNotFoundError as exc:
        print(str(exc), file=sys.stderr)
        return 2

    # Pre-flight 2: Verify every selected tier file exists before launching Chromium.
    selected_files = [tests_dir / name for name in TIER_MAP[args.tier]]
    missing_files = [p for p in selected_files if not p.is_file()]
    if missing_files:
        print(
            f"ERROR: Missing E2E test file(s) for --tier {args.tier}:",
            file=sys.stderr,
        )
        for missing in missing_files:
            print(f"  - {missing}", file=sys.stderr)
        return 2

    # Pre-flight 3: Verify Chromium and Node binaries.
    chromium_bin = find_chromium_binary()
    if not chromium_bin:
        print(
            "ERROR: Could not find Chromium binary (/usr/bin/chromium or /usr/bin/google-chrome).",
            file=sys.stderr,
        )
        return 2

    node_bin = find_node_binary()
    if not node_bin:
        print("ERROR: Could not find Node.js binary on PATH.", file=sys.stderr)
        return 2

    state: dict[str, object] = {
        "node_proc": None,
        "chromium_proc": None,
        "chromium_pgid": None,
        "stderr_fp": None,
        "httpd": None,
        "tmp_dir": None,
        "cleaned": False,
        "interrupted_signal": None,
    }
    cleanup_lock = threading.Lock()

    def cleanup() -> None:
        with cleanup_lock:
            if state["cleaned"]:
                return
            state["cleaned"] = True

            terminate_node_process(state["node_proc"])  # type: ignore[arg-type]
            terminate_chromium_process(
                state["chromium_proc"],  # type: ignore[arg-type]
                state["chromium_pgid"],  # type: ignore[arg-type]
            )

            stderr_fp = state["stderr_fp"]
            if stderr_fp is not None:
                try:
                    stderr_fp.close()  # type: ignore[attr-defined]
                except OSError:
                    pass

            httpd = state["httpd"]
            if httpd is not None:
                try:
                    httpd.shutdown()  # type: ignore[attr-defined]
                except OSError:
                    pass
                try:
                    httpd.server_close()  # type: ignore[attr-defined]
                except OSError:
                    pass

            tmp_dir = state["tmp_dir"]
            if tmp_dir is not None:
                shutil.rmtree(tmp_dir, ignore_errors=True)  # type: ignore[arg-type]

    def handle_signal(signum: int, _frame: object) -> None:
        state["interrupted_signal"] = signum
        terminate_node_process(state["node_proc"])  # type: ignore[arg-type]
        raise KeyboardInterrupt(f"Received signal {signum}")

    prev_sigint = signal.getsignal(signal.SIGINT)
    prev_sigterm = signal.getsignal(signal.SIGTERM)
    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    try:
        # 1. Start dual-mount ephemeral static HTTP server.
        handler_cls = functools.partial(DualMountRequestHandler, directory=str(site_dir))
        httpd = DualMountHTTPServer(("127.0.0.1", 0), handler_cls)
        state["httpd"] = httpd
        port = httpd.server_address[1]

        server_thread = threading.Thread(
            target=httpd.serve_forever,
            kwargs={"poll_interval": 0.1},
            daemon=True,
        )
        server_thread.start()

        # 2. Prepare isolated temp directory for Chromium profile, logs, and TAP output.
        tmp_dir = pathlib.Path(tempfile.mkdtemp(prefix="isp_e2e_"))
        os.chmod(tmp_dir, 0o700)
        state["tmp_dir"] = tmp_dir

        profile_dir = tmp_dir / "profile"
        profile_dir.mkdir(mode=0o700)
        stderr_log_path = tmp_dir / "chromium.stderr.log"
        tap_path = tmp_dir / "results.tap"

        stderr_fp = open(stderr_log_path, "wb")
        state["stderr_fp"] = stderr_fp

        # 3. Launch headless Chromium 156 in its own session/process group.
        chromium_cmd = [
            chromium_bin,
            "--headless=new",
            "--remote-debugging-port=0",
            f"--user-data-dir={profile_dir}",
            "--no-sandbox",
            "--disable-gpu",
            "--disable-dev-shm-usage",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-extensions",
            "--disable-background-networking",
            "--disable-sync",
            "--mute-audio",
            "about:blank",
        ]
        chromium_proc = subprocess.Popen(
            chromium_cmd,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=stderr_fp,
            start_new_session=True,
        )
        state["chromium_proc"] = chromium_proc
        try:
            state["chromium_pgid"] = os.getpgid(chromium_proc.pid)
        except OSError:
            state["chromium_pgid"] = chromium_proc.pid

        ws_url = discover_ws_url(chromium_proc, profile_dir, stderr_log_path, timeout_s=15.0)

        # 4. Run Node 24 test suite with simultaneous spec (stdout) and TAP (file) reporters.
        base_url = f"http://127.0.0.1:{port}"
        subpath_url = f"{base_url}{SUBPATH_PREFIX}"

        env = os.environ.copy()
        env.update(
            {
                "E2E_WS_URL": ws_url,
                "E2E_BASE_URL": base_url,
                "E2E_SUBPATH_URL": subpath_url,
                "E2E_SITE_DIR": str(site_dir),
                "E2E_REPO_ROOT": str(repo_root),
            }
        )

        node_cmd = [
            node_bin,
            "--test",
            "--test-isolation=none",
            "--test-concurrency=1",
            "--test-reporter=spec",
            "--test-reporter-destination=stdout",
            "--test-reporter=tap",
            f"--test-reporter-destination={tap_path}",
        ]
        if args.filter:
            node_cmd.append(f"--test-name-pattern={args.filter}")
        node_cmd.extend(str(p) for p in selected_files)

        node_proc = subprocess.Popen(
            node_cmd,
            cwd=str(repo_root),
            env=env,
        )
        state["node_proc"] = node_proc

        timed_out = False
        try:
            node_rc = node_proc.wait(timeout=args.timeout)
        except subprocess.TimeoutExpired:
            timed_out = True
            terminate_node_process(node_proc)
            node_rc = 124

        # 5. Strictly parse TAP output and enforce the zero-test / zero-skip contract.
        tap_stats = parse_tap_results(tap_path, selected_files, repo_root)
        tests_count = int(tap_stats["tests"])  # type: ignore[arg-type]
        passed_count = int(tap_stats["pass"])  # type: ignore[arg-type]
        failed_count = int(tap_stats["fail"])  # type: ignore[arg-type]
        cancelled_count = int(tap_stats["cancelled"])  # type: ignore[arg-type]
        skipped_count = int(tap_stats["skipped"])  # type: ignore[arg-type]
        todo_count = int(tap_stats["todo"])  # type: ignore[arg-type]
        real_tests_count = int(tap_stats["real_tests"])  # type: ignore[arg-type]
        summary_found = bool(tap_stats["summary_found"])

        extra_bits: list[str] = []
        if cancelled_count:
            extra_bits.append(f"{cancelled_count} cancelled")
        if todo_count:
            extra_bits.append(f"{todo_count} todo")
        extra_str = f", {', '.join(extra_bits)}" if extra_bits else ""

        print(
            f"\nServed: {site_dir} | Tests: {passed_count}/{tests_count} passed "
            f"({failed_count} failed, {skipped_count} skipped{extra_str})"
        )

        if timed_out:
            print(
                f"ERROR: E2E test execution exceeded --timeout={args.timeout:.1f}s.",
                file=sys.stderr,
            )
            return 124

        all_green = (
            node_rc == 0
            and summary_found
            and tests_count >= 1
            and real_tests_count >= 1
            and passed_count == tests_count
            and failed_count == 0
            and cancelled_count == 0
            and skipped_count == 0
            and todo_count == 0
        )

        if all_green:
            return 0

        reasons: list[str] = []
        if node_rc != 0:
            reasons.append(f"node exited with status {node_rc}")
        if not summary_found:
            reasons.append(f"TAP summary missing ({tap_stats.get('error')})")
        if tests_count < 1 or real_tests_count < 1:
            reasons.append(
                f"zero real tests executed (tests={tests_count}, real_tests={real_tests_count})"
            )
        if failed_count > 0:
            reasons.append(f"{failed_count} test(s) failed")
        if cancelled_count > 0:
            reasons.append(f"{cancelled_count} test(s) cancelled")
        if skipped_count > 0:
            reasons.append(f"{skipped_count} test(s) skipped")
        if todo_count > 0:
            reasons.append(f"{todo_count} test(s) marked todo")
        if summary_found and passed_count != tests_count and failed_count == 0:
            reasons.append(f"passed ({passed_count}) != total tests ({tests_count})")

        print(
            f"ERROR: E2E run failed strict exit criteria: {'; '.join(reasons)}.",
            file=sys.stderr,
        )
        return node_rc if node_rc != 0 else 1

    except KeyboardInterrupt:
        sig = state["interrupted_signal"]
        print(f"\nInterrupted (signal={sig}); cleaning up...", file=sys.stderr)
        return 143 if sig == signal.SIGTERM else 130
    except Exception as exc:
        print(f"ERROR: E2E harness failure: {exc}", file=sys.stderr)
        return 1
    finally:
        cleanup()
        signal.signal(signal.SIGINT, prev_sigint)
        signal.signal(signal.SIGTERM, prev_sigterm)


if __name__ == "__main__":
    raise SystemExit(main())
