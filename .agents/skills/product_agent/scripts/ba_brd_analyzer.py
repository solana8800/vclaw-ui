#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Công cụ hỗ trợ Product Agent đối chiếu yêu cầu với tài liệu nghiệp vụ.
Code dùng tên tiếng Anh; ghi chú và log dùng tiếng Việt theo chuẩn dự án.
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from dataclasses import asdict, dataclass
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[4]


@dataclass(frozen=True)
class Match:
    file_path: str
    line_number: int
    heading: str
    score: int
    excerpt: str


@dataclass(frozen=True)
class AnalysisReport:
    keyword: str
    module: str | None
    actor: str | None
    matches: list[Match]
    actors_found: list[str]
    enums: list[str]
    business_rules: list[str]
    open_question_prompts: list[str]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Đối chiếu yêu cầu nghiệp vụ với tài liệu BRD/product docs.")
    parser.add_argument("--feature", "--keyword", dest="feature", required=True, help="Từ khóa nghiệp vụ cần phân tích.")
    parser.add_argument("--module", help="Module nghiệp vụ cần ưu tiên khi tìm kiếm, lấy từ project context.")
    parser.add_argument("--actor", help="Actor cần kiểm tra, lấy từ project context/source docs.")
    parser.add_argument("--actors", help="Danh sách actor hợp lệ ngăn cách bằng dấu phẩy để trích xuất từ kết quả.")
    parser.add_argument("--master-doc", required=True, help="Tài liệu nghiệp vụ/product chính của project.")
    parser.add_argument("--detail-dir", required=True, help="Thư mục chứa tài liệu nghiệp vụ/product chi tiết.")
    parser.add_argument("--detail-glob", default="*.md", help="Glob tài liệu chi tiết trong --detail-dir.")
    parser.add_argument("--limit", type=int, default=10, help="Số đoạn ngữ cảnh tối đa cần hiển thị.")
    parser.add_argument("--format", choices=["markdown", "json"], default="markdown", help="Định dạng báo cáo đầu ra.")
    return parser.parse_args()


def read_lines(file_path: Path) -> list[str]:
    if not file_path.exists():
        raise FileNotFoundError(f"Không tìm thấy tài liệu: {file_path}")
    return file_path.read_text(encoding="utf-8").splitlines()


def display_path(file_path: Path) -> str:
    try:
        return str(file_path.relative_to(REPO_ROOT))
    except ValueError:
        return str(file_path)


def normalize_text(value: str) -> str:
    decomposed = unicodedata.normalize("NFD", value)
    without_marks = "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")
    return without_marks.lower()


def tokenize(value: str) -> list[str]:
    normalized = normalize_text(value)
    return [token for token in re.split(r"[^a-z0-9.]+", normalized) if len(token) >= 2]


def current_heading(lines: list[str], index: int) -> str:
    headings: list[str] = []
    for cursor in range(index, -1, -1):
        line = lines[cursor]
        if line.startswith("#"):
            headings.append(line.strip("# ").strip())
            if len(headings) >= 3:
                break
    return " > ".join(reversed(headings)) if headings else "Không xác định mục tài liệu"


def score_line(line: str, terms: list[str], actor: str | None, module: str | None) -> int:
    normalized = normalize_text(line)
    score = 0
    for term in terms:
        if term in normalized:
            score += 3 if len(term) > 3 else 1
    if actor and actor.lower() in line.lower():
        score += 5
    if module:
        for hint in tokenize(module):
            if hint in normalized:
                score += 2
    return score


def find_matches(file_path: Path, terms: list[str], limit: int, actor: str | None, module: str | None) -> list[Match]:
    lines = read_lines(file_path)
    matches: list[Match] = []

    for index, line in enumerate(lines):
        score = score_line(line, terms, actor, module)
        if score <= 0:
            continue

        start = max(0, index - 3)
        end = min(len(lines), index + 4)
        excerpt = "\n".join(f"Dòng {line_index + 1}: {lines[line_index]}" for line_index in range(start, end))
        matches.append(
            Match(
                file_path=display_path(file_path),
                line_number=index + 1,
                heading=current_heading(lines, index),
                score=score,
                excerpt=excerpt,
            )
        )

    matches.sort(key=lambda item: item.score, reverse=True)
    return matches[:limit]


def candidate_docs(master_doc: Path, detail_docs: list[Path], module: str | None) -> list[Path]:
    if not module:
        return [master_doc, *detail_docs]

    hints = tokenize(module)
    prioritized = [
        doc for doc in detail_docs
        if any(normalize_text(hint) in normalize_text(doc.name) for hint in hints)
    ]
    remaining = [doc for doc in detail_docs if doc not in prioritized]
    return [master_doc, *prioritized, *remaining]


def extract_master_headings(master_doc: Path, pattern: str) -> list[str]:
    lines = read_lines(master_doc)
    compiled = re.compile(pattern)
    return [match.group(1).strip() for line in lines if (match := compiled.match(line))]


def extract_enums(master_doc: Path) -> list[str]:
    return extract_master_headings(master_doc, r"^#{2,4}\s+(?:3\.\d+\s+)?(.+(?:Enum|Status|Type|Level|Role).*)$")


def extract_business_rules(master_doc: Path) -> list[str]:
    return extract_master_headings(master_doc, r"^#{2,4}\s+((?:BR-|Rule|Quy tắc).+)$")


def extract_actors(matches: list[Match], actors: list[str]) -> list[str]:
    text = "\n".join(match.excerpt for match in matches)
    return [actor for actor in actors if actor in text]


def build_report(keyword: str, module: str | None, actor: str | None, actors: list[str], limit: int, master_doc: Path, detail_docs: list[Path]) -> AnalysisReport:
    terms = tokenize(keyword)
    if module:
        terms.extend(tokenize(module))
    if actor:
        terms.extend(tokenize(actor))

    collected: list[Match] = []
    for file_path in candidate_docs(master_doc, detail_docs, module):
        remaining = limit - len(collected)
        if remaining <= 0:
            break
        collected.extend(find_matches(file_path, terms, remaining, actor, module))

    collected.sort(key=lambda item: item.score, reverse=True)
    collected = collected[:limit]

    return AnalysisReport(
        keyword=keyword,
        module=module,
        actor=actor,
        matches=collected,
        actors_found=extract_actors(collected, actors),
        enums=extract_enums(master_doc),
        business_rules=extract_business_rules(master_doc),
        open_question_prompts=[
            "BRD đã định nghĩa actor/permission cho luồng này chưa?",
            "Có enum/status hiện hữu nào phải tái sử dụng thay vì tạo mới không?",
            "Dữ liệu có chạm biên tích hợp ngoài, thanh toán, y tế hoặc PII nhạy cảm không?",
            "Acceptance Criteria đã đủ để QC viết test happy path, validation, auth và edge case chưa?",
        ],
    )


def print_markdown(report: AnalysisReport) -> None:
    print("=" * 88)
    print(f"BÁO CÁO ĐỐI CHIẾU BRD CHO TỪ KHÓA: {report.keyword}")
    print("=" * 88)
    if report.module:
        print(f"Module ưu tiên: {report.module}")
    if report.actor:
        print(f"Actor cần kiểm tra: {report.actor}")

    print("\n[1] Ngữ cảnh tìm thấy trong tài liệu")
    if not report.matches:
        print("- Không tìm thấy khớp trực tiếp. Hãy thử từ khóa gần nghiệp vụ hơn hoặc đọc module liên quan.")
    for index, match in enumerate(report.matches, start=1):
        print(f"\n--- Kết quả {index}: {match.file_path}:{match.line_number} | score={match.score}")
        print(f"Mục tài liệu: {match.heading}")
        print(match.excerpt)

    print("\n[2] Actor phát hiện trong ngữ cảnh")
    print(", ".join(report.actors_found) if report.actors_found else "- Chưa phát hiện actor trực tiếp trong đoạn khớp.")

    print("\n[3] Enum/status nền tảng cần kiểm tra trước khi tạo mới")
    for enum_name in report.enums:
        print(f"- {enum_name}")

    print("\n[4] Business rules nền tảng cần rà soát")
    for rule in report.business_rules:
        print(f"- {rule}")

    print("\n[5] Open questions bắt buộc trước khi bàn giao QC")
    for question in report.open_question_prompts:
        print(f"- {question}")
    print("=" * 88)


def main() -> int:
    args = parse_args()
    master_doc = Path(args.master_doc).expanduser().resolve()
    detail_dir = Path(args.detail_dir).expanduser().resolve()
    detail_docs = sorted(detail_dir.glob(args.detail_glob)) if detail_dir.exists() else []
    actors = [item.strip() for item in (args.actors or args.actor or "").split(",") if item.strip()]
    report = build_report(args.feature, args.module, args.actor, actors, args.limit, master_doc, detail_docs)
    if args.format == "json":
        print(json.dumps(asdict(report), ensure_ascii=False, indent=2))
    else:
        print_markdown(report)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
