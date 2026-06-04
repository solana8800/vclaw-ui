#!/usr/bin/env python3
"""Workflow Control helper for portable agent workflows.

This script intentionally avoids calling LLMs or mutating product code. It gives
Workflow Control-compatible tools a stable registry validator and a run-artifact bootstrap.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import re
import sys
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[3]
HWC_PATH = REPO_ROOT / ".agents" / "orchestration" / "workflow-control.json"
REQUIRED_MANIFEST_KEYS = {
    "id",
    "version",
    "role",
    "skillFile",
    "personaFile",
    "inputs",
    "outputs",
    "allowedTools",
    "forbiddenActions",
}


def run_root_from_config(workflow_control: dict[str, Any]) -> Path:
    return Path(os.environ.get("HWC_RUN_ROOT", REPO_ROOT / workflow_control.get("runArtifactRoot", ".agents/runs")))


def run_index_path(workflow_control: dict[str, Any]) -> Path:
    default_path = REPO_ROOT / workflow_control.get("runIndexPath", ".agents/orchestration/run-index.json")
    return Path(os.environ.get("HWC_RUN_INDEX", default_path))


def load_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise SystemExit(f"Khong tim thay file: {path}") from None
    except json.JSONDecodeError as exc:
        raise SystemExit(f"JSON khong hop le tai {path}: {exc}") from None


def read_json_file(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise SystemExit(f"JSON khong hop le tai {path}: {exc}") from None


def write_json_file(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def rel(path: Path) -> str:
    try:
        return str(path.relative_to(REPO_ROOT))
    except ValueError:
        return str(path)


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = value.strip("-")
    return value[:60] or "task"


def request_hash(request: str) -> str:
    normalized = re.sub(r"\s+", " ", request.strip().lower())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def load_run_index(path: Path) -> dict[str, Any]:
    index = read_json_file(path, {"runs": []})
    if not isinstance(index, dict) or not isinstance(index.get("runs"), list):
        raise SystemExit(f"run-index khong dung format: {path}")
    return index


def find_duplicate_run(index: dict[str, Any], source_type: str, source_id: str, req_hash: str) -> dict[str, Any] | None:
    for item in index.get("runs", []):
        same_source = source_id and item.get("sourceType") == source_type and item.get("sourceId") == source_id
        same_request = item.get("requestHash") == req_hash and item.get("status") in {"DRAFT", "RUNNING", "BLOCKED"}
        if same_source or same_request:
            return item
    return None


def validate_registry() -> list[str]:
    errors: list[str] = []
    workflow_control = load_json(HWC_PATH)

    for source in workflow_control.get("instructionSources", []):
        path = REPO_ROOT / source
        if not path.exists():
            errors.append(f"Thieu instruction source: {source}")

    default_context = workflow_control.get("defaultProjectContext")
    if default_context and not (REPO_ROOT / default_context).exists():
        errors.append(f"Thieu default project context: {default_context}")

    registry = workflow_control.get("skillRegistry", {})
    if not registry:
        errors.append("skillRegistry rong.")

    for skill_id, entry in registry.items():
        manifest_path = REPO_ROOT / entry.get("manifest", "")
        if not manifest_path.exists():
            errors.append(f"{skill_id}: thieu manifest {rel(manifest_path)}")
            continue

        manifest = load_json(manifest_path)
        missing = sorted(REQUIRED_MANIFEST_KEYS - set(manifest))
        if missing:
            errors.append(f"{skill_id}: manifest thieu keys {', '.join(missing)}")

        if manifest.get("id") != skill_id:
            errors.append(f"{skill_id}: manifest id khong khop ({manifest.get('id')})")

        for file_key in ("skillFile", "personaFile"):
            file_path = REPO_ROOT / str(manifest.get(file_key, ""))
            if not file_path.exists():
                errors.append(f"{skill_id}: {file_key} khong ton tai: {rel(file_path)}")

        for context_path in manifest.get("projectContexts", []):
            if not (REPO_ROOT / context_path).exists():
                errors.append(f"{skill_id}: project context khong ton tai: {context_path}")

    workflows = workflow_control.get("workflows", {})
    for workflow_id, workflow in workflows.items():
        steps = workflow.get("steps", [])
        if not steps:
            errors.append(f"{workflow_id}: workflow khong co steps.")
        for step in steps:
            owner = step.get("owner")
            if owner and owner not in registry:
                errors.append(f"{workflow_id}.{step.get('id')}: owner khong co trong registry: {owner}")

    return errors


def command_validate(_: argparse.Namespace) -> int:
    errors = validate_registry()
    if errors:
        print("Workflow Control registry FAIL")
        for error in errors:
            print(f"- {error}")
        return 1
    print("Workflow Control registry PASS")
    print(f"- Manifest: {rel(HWC_PATH)}")
    print("- Skill manifests: validated")
    print("- Workflows: validated")
    return 0


def command_workflows(_: argparse.Namespace) -> int:
    workflow_control = load_json(HWC_PATH)
    for workflow_id, workflow in workflow_control.get("workflows", {}).items():
        print(f"{workflow_id}: {workflow.get('description', '')}")
        for step in workflow.get("steps", []):
            optional = " optional" if step.get("optionalWhen") else ""
            print(f"  - {step['id']} -> {step.get('owner', 'n/a')} ({step.get('artifact')}){optional}")
    return 0


def render_run_readme(
    run_id: str,
    title: str,
    request: str,
    workflow_id: str,
    project_context: str,
    workflow: dict[str, Any],
    source_type: str,
    source_id: str,
) -> str:
    lines = [
        f"# Workflow Run - {title}",
        "",
        "## Run Info",
        "",
        f"- Run ID: `{run_id}`",
        f"- Workflow: `{workflow_id}`",
        f"- Project context: `{project_context}`",
        f"- Source: `{source_type}:{source_id or 'none'}`",
        "- Output root: `outputs/`",
        f"- Created at: `{dt.datetime.now(dt.timezone.utc).isoformat()}`",
        "",
        "## User Request",
        "",
        "```text",
        request.strip(),
        "```",
        "",
        "## Workflow Checklist",
        "",
    ]

    for step in workflow.get("steps", []):
        optional = " (optional)" if step.get("optionalWhen") else ""
        lines.extend(
            [
                f"- [ ] `{step['id']}` - `{step.get('owner', 'n/a')}`{optional}",
                f"  - Artifact: `outputs/{step.get('artifact', 'n/a')}`",
                "  - Status: `PENDING`",
            ]
        )

    lines.extend(
        [
            "",
            "## Completion Notes",
            "",
            "- Full SDLC: Engineering chi duoc implement sau khi QC test contract da ton tai hoac co ly do khong automate duoc.",
            "- ADLC: Neu task co AI/Agent/LLM tag, can prototype/eval truoc production workflow.",
            "- Bao cao khong duoc chua PII, token, password, connection string hoac full payment data.",
            "",
        ]
    )
    return "\n".join(lines)


def command_init_run(args: argparse.Namespace) -> int:
    errors = validate_registry()
    if errors:
        print("Khong the init run vi registry dang FAIL:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    workflow_control = load_json(HWC_PATH)
    workflows = workflow_control.get("workflows", {})
    if args.workflow not in workflows:
        print(f"Workflow khong hop le: {args.workflow}", file=sys.stderr)
        print(f"Hop le: {', '.join(sorted(workflows))}", file=sys.stderr)
        return 1

    project_context = args.project_context or workflow_control.get("defaultProjectContext")
    if project_context and not (REPO_ROOT / project_context).exists():
        print(f"Project context khong ton tai: {project_context}", file=sys.stderr)
        return 1

    timestamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    run_id = f"{timestamp}-{slugify(args.title)}"
    req_hash = request_hash(args.request)
    source_type = args.source_type
    source_id = args.source_id or req_hash[:16]
    index_path = run_index_path(workflow_control)
    index = load_run_index(index_path)
    duplicate = find_duplicate_run(index, source_type, source_id, req_hash)
    if duplicate is not None:
        print(f"Existing workflow run: {duplicate['path']}")
        print(f"- Run ID: {duplicate['runId']}")
        print(f"- Source: {duplicate.get('sourceType')}:{duplicate.get('sourceId')}")
        return 0

    run_root = run_root_from_config(workflow_control)
    run_dir = run_root / run_id
    run_dir.mkdir(parents=True, exist_ok=False)
    output_root = "outputs"
    (run_dir / output_root).mkdir(parents=True, exist_ok=True)

    run_json = {
        "runId": run_id,
        "title": args.title,
        "request": args.request,
        "workflow": args.workflow,
        "projectContext": project_context,
        "sourceType": source_type,
        "sourceId": source_id,
        "requestHash": req_hash,
        "status": "DRAFT",
        "outputRoot": output_root,
        "createdAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "artifacts": [
            {
                "step": step["id"],
                "owner": step.get("owner"),
                "path": f"{output_root}/{step.get('artifact')}",
                "status": "PENDING"
            }
            for step in workflows[args.workflow].get("steps", [])
        ]
    }

    (run_dir / "run.json").write_text(json.dumps(run_json, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (run_dir / "README.md").write_text(
        render_run_readme(
            run_id=run_id,
            title=args.title,
            request=args.request,
            workflow_id=args.workflow,
            project_context=project_context,
            workflow=workflows[args.workflow],
            source_type=source_type,
            source_id=source_id,
        ),
        encoding="utf-8",
    )
    index["runs"].append(
        {
            "runId": run_id,
            "path": rel(run_dir),
            "workflow": args.workflow,
            "title": args.title,
            "sourceType": source_type,
            "sourceId": source_id,
            "requestHash": req_hash,
            "status": "DRAFT",
            "createdAt": run_json["createdAt"],
        }
    )
    write_json_file(index_path, index)

    print(f"Created workflow run: {rel(run_dir)}")
    print(f"- README: {rel(run_dir / 'README.md')}")
    print(f"- State: {rel(run_dir / 'run.json')}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Portable Workflow Control helper")
    subparsers = parser.add_subparsers(dest="command", required=True)

    validate = subparsers.add_parser("validate", help="Validate Workflow Control registry and skill manifests")
    validate.set_defaults(func=command_validate)

    workflows = subparsers.add_parser("workflows", help="List available Workflow Control workflows")
    workflows.set_defaults(func=command_workflows)

    init_run = subparsers.add_parser("init-run", help="Create a run artifact directory")
    init_run.add_argument("--workflow", required=True, help="Workflow id from workflow-control.json")
    init_run.add_argument("--title", required=True, help="Human-readable task title")
    init_run.add_argument("--request", required=True, help="Original user/business request")
    init_run.add_argument("--project-context", default=None, help="Project context path")
    init_run.add_argument("--source-type", default="manual", help="Source type such as manual, github_issue, dashboard")
    init_run.add_argument("--source-id", default="", help="External source id for dedupe")
    init_run.set_defaults(func=command_init_run)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
