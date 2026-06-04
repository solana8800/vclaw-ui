#!/usr/bin/env python3
"""Lightweight self-tests for Workflow Control helper scripts."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
RUNNER = REPO_ROOT / ".agents" / "orchestration" / "scripts" / "workflow_runner.py"


def run_cmd(args: list[str], env: dict[str, str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, *args],
        cwd=REPO_ROOT,
        env=env,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )


def test_init_run_dedupes_by_source_id() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        run_root = Path(tmp) / "runs"
        index_path = Path(tmp) / "run-index.json"
        env = {
            **os.environ,
            "HWC_RUN_ROOT": str(run_root),
            "HWC_RUN_INDEX": str(index_path),
        }
        args = [
            str(RUNNER),
            "init-run",
            "--workflow",
            "fast_path",
            "--title",
            "Docs cleanup",
            "--request",
            "Update documentation for Workflow Control.",
            "--source-type",
            "manual",
            "--source-id",
            "REQ-001",
        ]

        first = run_cmd(args, env)
        assert first.returncode == 0, first.stderr or first.stdout
        first_run = next(line for line in first.stdout.splitlines() if line.startswith("Created workflow run:"))

        second = run_cmd(args, env)
        assert second.returncode == 0, second.stderr or second.stdout
        assert "Existing workflow run:" in second.stdout
        assert first_run.split(": ", 1)[1] in second.stdout
        assert len([path for path in run_root.iterdir() if path.is_dir()]) == 1


def test_init_run_creates_outputs_directory_and_artifact_paths() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        run_root = Path(tmp) / "runs"
        index_path = Path(tmp) / "run-index.json"
        env = {
            **os.environ,
            "HWC_RUN_ROOT": str(run_root),
            "HWC_RUN_INDEX": str(index_path),
        }

        result = run_cmd(
            [
                str(RUNNER),
                "init-run",
                "--workflow",
                "fast_path",
                "--title",
                "Readable output layout",
                "--request",
                "Tao run voi output folder rieng.",
                "--source-type",
                "manual",
                "--source-id",
                "REQ-OUTPUTS",
            ],
            env,
        )

        assert result.returncode == 0, result.stderr or result.stdout
        run_dirs = [path for path in run_root.iterdir() if path.is_dir()]
        assert len(run_dirs) == 1
        run_dir = run_dirs[0]
        assert (run_dir / "outputs").is_dir()

        run_json = json.loads((run_dir / "run.json").read_text(encoding="utf-8"))
        assert run_json["outputRoot"] == "outputs"
        assert run_json["artifacts"][0]["path"] == "outputs/01-fast-path.md"
        assert "gate" not in run_json["artifacts"][0]
        assert "riskTags" not in run_json
        assert "Output root: `outputs/`" in (run_dir / "README.md").read_text(encoding="utf-8")


def main() -> int:
    tests = [
        test_init_run_dedupes_by_source_id,
        test_init_run_creates_outputs_directory_and_artifact_paths,
    ]
    for test in tests:
        test()
        print(f"PASS {test.__name__}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
