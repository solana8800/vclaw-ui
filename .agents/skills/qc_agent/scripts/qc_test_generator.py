#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Công cụ sinh test contract xUnit cho .NET adapter.
Test được sinh ra dùng WebApplicationFactory để chạy API thật trong process kiểm thử.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import zipfile
from dataclasses import dataclass
from pathlib import Path
from xml.etree import ElementTree


REPO_ROOT = Path(__file__).resolve().parents[4]
XLSX_MAIN_NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
XLSX_REL_NS = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
REL_NS = "{http://schemas.openxmlformats.org/package/2006/relationships}"


@dataclass(frozen=True)
class ImportedTestCase:
    test_case_id: str
    scenario: str
    method: str
    route: str
    input_text: str
    expected_status_code: str
    expected_result: str
    actor: str
    protected: bool
    business_rule: str


@dataclass(frozen=True)
class DesignReference:
    source: str
    node: str
    platform: str
    note: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sinh test contract API cho QC Agent.")
    parser.add_argument("--entity", "--controller", dest="entity", required=True, help="Tên entity/controller bằng tiếng Anh.")
    parser.add_argument("--route", help="Route sau base prefix. Nếu bỏ trống sẽ suy ra từ entity.")
    parser.add_argument("--base-prefix", default="/api", help="Prefix API lấy từ project context; mặc định portable là /api.")
    parser.add_argument("--test-dir", required=True, help="Thư mục test output, lấy từ project context.")
    parser.add_argument("--namespace", required=True, help="Namespace C# cho file test được sinh, lấy từ project context.")
    parser.add_argument("--actions", default="Create,GetById,Validation,Unauthorized,Vietnamese,Security", help="Danh sách action ngăn cách bằng dấu phẩy.")
    parser.add_argument("--properties", help="Danh sách Field:Type để sinh payload đúng contract, ví dụ ResidentId:Guid,Rating:int,Comment:string.")
    parser.add_argument("--protected", action="store_true", help="Đánh dấu endpoint cần auth để sinh client có/không có token.")
    parser.add_argument("--testcase-file", help="Đường dẫn file test case Excel/CSV/TSV truyền thống để import và sinh xUnit.")
    parser.add_argument("--sheet", help="Tên sheet trong file Excel. Nếu bỏ trống sẽ dùng sheet đầu tiên.")
    parser.add_argument("--design-source", help="Link Figma, tên file export từ Figma MCP, hoặc mã design handoff dùng để trace test.")
    parser.add_argument("--figma-node", help="Figma node/frame/component id liên quan đến test contract.")
    parser.add_argument("--platform", default="api", help="Nền tảng contract cần kiểm thử, lấy từ project context.")
    parser.add_argument("--design-note", help="Ghi chú ngắn về state/interaction/data dependency lấy từ design.")
    parser.add_argument("--dedupe", choices=["skip", "error"], default="skip", help="Cách xử lý test case trùng trong file import.")
    parser.add_argument("--overwrite", action="store_true", help="Cho phép ghi đè file test đã tồn tại.")
    return parser.parse_args()


def to_kebab_case(value: str) -> str:
    words = re.sub("([a-z0-9])([A-Z])", r"\1-\2", value).replace("_", "-")
    return words.lower()


def pluralize(value: str) -> str:
    if value.endswith("y"):
        return f"{value[:-1]}ies"
    if value.endswith("s"):
        return value
    return f"{value}s"


def parse_properties(raw_properties: str | None) -> list[tuple[str, str]]:
    if not raw_properties:
        return [("Title", "string"), ("Content", "string"), ("Rating", "int")]
    properties: list[tuple[str, str]] = []
    for item in raw_properties.split(","):
        if ":" not in item:
            continue
        name, type_name = item.split(":", 1)
        properties.append((name.strip(), type_name.strip()))
    return properties


def to_camel_case(value: str) -> str:
    return value[:1].lower() + value[1:] if value else value


def normalize_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.strip().lower())


def normalize_method(value: str) -> str:
    method = value.strip().upper()
    return method if method in {"GET", "POST", "PUT", "PATCH", "DELETE"} else "POST"


def normalize_route(route: str, default_route: str, base_prefix: str) -> str:
    selected = route.strip() or f"{base_prefix.rstrip('/')}/{default_route.strip('/')}"
    if not selected.startswith("/"):
        selected = f"/{selected}"
    if not selected.startswith(base_prefix.rstrip("/")):
        selected = f"{base_prefix.rstrip('/')}/{selected.strip('/')}"
    return selected


def to_bool(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "yes", "y", "protected", "auth", "required", "có", "co"}


def status_code_expression(value: str) -> str:
    normalized = value.strip()
    if not normalized:
        return "HttpStatusCode.OK"
    if normalized.isdigit():
        return f"(HttpStatusCode){normalized}"
    aliases = {
        "OK": "OK",
        "CREATED": "Created",
        "BADREQUEST": "BadRequest",
        "UNAUTHORIZED": "Unauthorized",
        "FORBIDDEN": "Forbidden",
        "NOTFOUND": "NotFound",
        "CONFLICT": "Conflict",
        "NOCONTENT": "NoContent",
        "INTERNALSERVERERROR": "InternalServerError",
    }
    compact = normalize_key(normalized).upper()
    return f"HttpStatusCode.{aliases.get(compact, 'OK')}"


def sanitize_identifier(value: str, fallback: str) -> str:
    words = re.findall(r"[A-Za-z0-9]+", value)
    if not words:
        words = [fallback]
    identifier = "".join(word[:1].upper() + word[1:] for word in words)
    if identifier[0].isdigit():
        identifier = f"Case{identifier}"
    return identifier


def parse_input_pairs(raw_input: str) -> dict[str, object] | None:
    text = raw_input.strip()
    if not text:
        return {}
    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else {"value": parsed}
    except json.JSONDecodeError:
        pass

    pairs: dict[str, object] = {}
    separators = "\n" if "\n" in text else ","
    for item in text.split(separators):
        if not item.strip():
            continue
        delimiter = ":" if ":" in item else "=" if "=" in item else None
        if delimiter is None:
            return None
        key, value = item.split(delimiter, 1)
        pairs[key.strip()] = coerce_literal(value.strip())
    return pairs


def coerce_literal(value: str) -> object:
    lowered = value.lower()
    if lowered in {"true", "false"}:
        return lowered == "true"
    if lowered in {"null", "none"}:
        return None
    try:
        return int(value)
    except ValueError:
        pass
    try:
        return float(value)
    except ValueError:
        return value.strip('"')


def csharp_literal(value: object) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        return f"{value}d"
    text = str(value)
    if re.fullmatch(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}", text):
        return f'Guid.Parse("{text}")'
    escaped = text.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def xml_escape(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def build_design_reference(args: argparse.Namespace) -> DesignReference | None:
    if not any([args.design_source, args.figma_node, args.design_note, args.platform != "api"]):
        return None
    return DesignReference(
        source=args.design_source or "",
        node=args.figma_node or "",
        platform=args.platform,
        note=args.design_note or "",
    )


def design_summary_lines(design_reference: DesignReference | None, indent: str = "/// ") -> str:
    if design_reference is None:
        return ""
    lines = [
        f"{indent}Design source: {xml_escape(design_reference.source or 'Không khai báo')}",
        f"{indent}Figma node/frame: {xml_escape(design_reference.node or 'Không khai báo')}",
        f"{indent}Platform: {xml_escape(design_reference.platform)}",
    ]
    if design_reference.note:
        lines.append(f"{indent}Design note: {xml_escape(design_reference.note)}")
    return "\n".join(lines) + "\n"


def build_request_from_import(raw_input: str, indent: str = "        ") -> tuple[str, bool]:
    parsed = parse_input_pairs(raw_input)
    if parsed is None:
        escaped = raw_input.replace("\\", "\\\\").replace('"', '\\"')
        return f'new StringContent("{escaped}", Encoding.UTF8, "application/json")', True
    if not parsed:
        return "new { }", False
    lines = [
        f"{indent}    {to_camel_case(str(key))} = {csharp_literal(value)},"
        for key, value in parsed.items()
    ]
    return "new\n" + indent + "{\n" + "\n".join(lines).rstrip(",") + "\n" + indent + "}", False


def sample_value(name: str, type_name: str, vietnamese: bool = False, unsafe: bool = False) -> str:
    lower_name = name.lower()
    normalized_type = type_name.lower().rstrip("?")
    if unsafe and normalized_type == "string":
        return '"\'; DROP TABLE Residents; --"'
    if normalized_type == "guid":
        return "Guid.NewGuid()"
    if normalized_type in {"int", "int32"}:
        return "5"
    if normalized_type in {"long", "int64"}:
        return "5L"
    if normalized_type in {"decimal", "double"}:
        return "5m" if normalized_type == "decimal" else "5d"
    if normalized_type == "bool":
        return "true"
    if normalized_type in {"datetime", "datetimeoffset"}:
        return "DateTime.UtcNow"
    if normalized_type == "dateonly":
        return "DateOnly.FromDateTime(DateTime.UtcNow)"
    if "email" in lower_name:
        return '"family@example.com"'
    if "phone" in lower_name:
        return '"0901234567"'
    if vietnamese or lower_name in {"title", "content", "comment", "note", "description", "name"}:
        return '"Nội dung tiếng Việt có dấu cho kiểm thử"'
    return f'"{name} kiểm thử"'


def build_anonymous_object(properties: list[tuple[str, str]], vietnamese: bool = False, unsafe: bool = False) -> str:
    lines = [
        f"            {to_camel_case(name)} = {sample_value(name, type_name, vietnamese=vietnamese, unsafe=unsafe)},"
        for name, type_name in properties
    ]
    return "new\n        {\n" + "\n".join(lines).rstrip(",") + "\n        }"


def build_test_code(entity: str, route: str, base_prefix: str, actions: set[str], properties: list[tuple[str, str]], protected: bool, namespace: str, design_reference: DesignReference | None = None) -> str:
    class_name = f"{pluralize(entity)}ApiTests"
    api_route = f"{base_prefix.rstrip('/')}/{route.strip('/')}"
    valid_payload = build_anonymous_object(properties)
    vietnamese_payload = build_anonymous_object(properties, vietnamese=True)
    unsafe_payload = build_anonymous_object(properties, unsafe=True)
    auth_client = "_authorizedClient" if protected else "_anonymousClient"
    design_summary = design_summary_lines(design_reference).rstrip()
    design_doc = design_summary if design_summary else ""

    methods: list[str] = []

    if "Create" in actions:
        methods.append(f"""
    [Fact]
    public async Task Create_WithValidRequest_ShouldReturnCreatedEnvelope()
    {{
        // Gửi dữ liệu hợp lệ để khóa chặt contract tạo mới.
        var request = {valid_payload};

        var response = await {auth_client}.PostAsJsonAsync("{api_route}", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("success");
    }}
""")

    if "GetById" in actions or "Get" in actions:
        methods.append(f"""
    [Fact]
    public async Task GetById_WithUnknownId_ShouldReturnNotFound()
    {{
        // Một mã định danh ngẫu nhiên không được có sẵn trong dữ liệu seed.
        var unknownId = Guid.NewGuid();

        var response = await {auth_client}.GetAsync($"{api_route}/{{unknownId}}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }}
""")

    if "Validation" in actions:
        methods.append(f"""
    [Fact]
    public async Task Create_WithMissingRequiredField_ShouldReturnBadRequest()
    {{
        // Body rỗng phải bị chặn bởi validation thay vì lưu dữ liệu thiếu.
        var response = await {auth_client}.PostAsJsonAsync("{api_route}", new {{ }});

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }}
""")

    if "Unauthorized" in actions:
        methods.append(f"""
    [Fact]
    public async Task Request_WithoutToken_ShouldReturnUnauthorizedOrForbiddenWhenProtected()
    {{
        // Endpoint bảo vệ phải từ chối request chưa xác thực.
        var response = await _anonymousClient.GetAsync("{api_route}");

        response.StatusCode.Should().BeOneOf(HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden);
    }}
""")

    if "Vietnamese" in actions:
        methods.append(f"""
    [Fact]
    public async Task Create_WithVietnameseText_ShouldPreserveUnicodeInput()
    {{
        // Dữ liệu tiếng Việt có dấu phải đi qua request pipeline mà không bị lỗi encoding.
        var request = {vietnamese_payload};

        var response = await {auth_client}.PostAsJsonAsync("{api_route}", request);
        var body = await response.Content.ReadAsStringAsync();

        response.StatusCode.Should().NotBe(HttpStatusCode.InternalServerError);
        body.Should().NotBeNullOrWhiteSpace();
    }}
""")

    if "Security" in actions:
        methods.append(f"""
    [Fact]
    public async Task Create_WithSqlInjectionPayload_ShouldNotExecuteInjectedInput()
    {{
        // Payload nguy hiểm chỉ được xem là dữ liệu đầu vào, không được biến thành câu SQL.
        var request = {unsafe_payload};

        var response = await {auth_client}.PostAsJsonAsync("{api_route}", request);

        response.StatusCode.Should().NotBe(HttpStatusCode.InternalServerError);
    }}
""")

    body = "\n".join(methods).rstrip()
    auth_support = """
public sealed class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public TestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Role, "STAFF")
        };
        var identity = new ClaimsIdentity(claims, "Test");
        var principal = new ClaimsPrincipal(identity);
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(principal, "Test")));
    }
}
""" if protected else ""

    factory_setup = """
        _authorizedClient = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureTestServices(services =>
            {
                services.AddAuthentication("Test")
                    .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("Test", _ => { });
            });
        }).CreateClient();
""" if protected else "        _authorizedClient = _anonymousClient;\n"

    return f"""using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Xunit;

namespace {namespace};

/// <summary>
/// Bộ kiểm thử contract cho API {entity}; các kịch bản này phải được viết trước khi Engineering code.
{design_doc}
/// </summary>
public class {class_name} : IClassFixture<WebApplicationFactory<Program>>
{{
    private readonly HttpClient _anonymousClient;
    private readonly HttpClient _authorizedClient;

    public {class_name}(WebApplicationFactory<Program> factory)
    {{
        _anonymousClient = factory.CreateClient();
{factory_setup.rstrip()}
    }}

{body}
}}

{auth_support}"""


def cell_ref_to_column_index(cell_ref: str) -> int:
    letters = "".join(ch for ch in cell_ref if ch.isalpha())
    index = 0
    for letter in letters:
        index = index * 26 + (ord(letter.upper()) - ord("A") + 1)
    return index - 1


def read_shared_strings(archive: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in archive.namelist():
        return []
    root = ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
    values: list[str] = []
    for item in root.findall(f"{XLSX_MAIN_NS}si"):
        texts = [node.text or "" for node in item.iter(f"{XLSX_MAIN_NS}t")]
        values.append("".join(texts))
    return values


def workbook_sheet_targets(archive: zipfile.ZipFile) -> dict[str, str]:
    workbook = ElementTree.fromstring(archive.read("xl/workbook.xml"))
    rels = ElementTree.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    rel_targets = {
        rel.attrib["Id"]: rel.attrib["Target"]
        for rel in rels.findall(f"{REL_NS}Relationship")
    }
    sheets: dict[str, str] = {}
    for sheet in workbook.findall(f".//{XLSX_MAIN_NS}sheet"):
        name = sheet.attrib["name"]
        relation_id = sheet.attrib[f"{XLSX_REL_NS}id"]
        target = rel_targets[relation_id]
        if not target.startswith("xl/"):
            target = f"xl/{target.lstrip('/')}"
        sheets[name] = target
    return sheets


def read_xlsx_rows(file_path: Path, sheet_name: str | None) -> list[dict[str, str]]:
    with zipfile.ZipFile(file_path) as archive:
        shared_strings = read_shared_strings(archive)
        sheet_targets = workbook_sheet_targets(archive)
        if not sheet_targets:
            return []
        selected_sheet = sheet_name or next(iter(sheet_targets))
        if selected_sheet not in sheet_targets:
            available = ", ".join(sheet_targets)
            raise ValueError(f"Không tìm thấy sheet '{selected_sheet}'. Sheet hiện có: {available}")

        root = ElementTree.fromstring(archive.read(sheet_targets[selected_sheet]))
        matrix: list[list[str]] = []
        for row in root.findall(f".//{XLSX_MAIN_NS}row"):
            values: list[str] = []
            for cell in row.findall(f"{XLSX_MAIN_NS}c"):
                column_index = cell_ref_to_column_index(cell.attrib.get("r", "A1"))
                while len(values) <= column_index:
                    values.append("")
                value_node = cell.find(f"{XLSX_MAIN_NS}v")
                inline_node = cell.find(f"{XLSX_MAIN_NS}is/{XLSX_MAIN_NS}t")
                if inline_node is not None:
                    values[column_index] = inline_node.text or ""
                elif value_node is None:
                    values[column_index] = ""
                elif cell.attrib.get("t") == "s":
                    values[column_index] = shared_strings[int(value_node.text or "0")]
                else:
                    values[column_index] = value_node.text or ""
            matrix.append(values)

    if not matrix:
        return []
    headers = [cell.strip() for cell in matrix[0]]
    return [
        {headers[index]: row[index].strip() if index < len(row) else "" for index in range(len(headers)) if headers[index]}
        for row in matrix[1:]
        if any(cell.strip() for cell in row)
    ]


def read_delimited_rows(file_path: Path) -> list[dict[str, str]]:
    delimiter = "\t" if file_path.suffix.lower() == ".tsv" else ","
    with file_path.open("r", encoding="utf-8-sig", newline="") as handle:
        return [dict(row) for row in csv.DictReader(handle, delimiter=delimiter)]


def read_raw_testcase_rows(file_path: Path, sheet_name: str | None) -> list[dict[str, str]]:
    suffix = file_path.suffix.lower()
    if suffix in {".csv", ".tsv"}:
        return read_delimited_rows(file_path)
    if suffix == ".xlsx":
        return read_xlsx_rows(file_path, sheet_name)
    raise ValueError("Chỉ hỗ trợ file .xlsx, .csv hoặc .tsv.")


def pick(row: dict[str, str], *names: str) -> str:
    normalized = {normalize_key(key): value for key, value in row.items()}
    for name in names:
        value = normalized.get(normalize_key(name))
        if value is not None:
            return str(value).strip()
    return ""


def imported_signature(test_case: ImportedTestCase) -> str:
    raw = "|".join([
        test_case.test_case_id,
        test_case.method,
        test_case.route,
        test_case.input_text,
        test_case.expected_status_code,
        test_case.expected_result,
        test_case.actor,
    ])
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()


def import_test_cases(file_path: Path, sheet_name: str | None, default_route: str, base_prefix: str, dedupe: str) -> tuple[list[ImportedTestCase], int]:
    rows = read_raw_testcase_rows(file_path, sheet_name)
    imported: list[ImportedTestCase] = []
    seen: set[str] = set()
    duplicate_count = 0

    for index, row in enumerate(rows, start=2):
        scenario = pick(row, "Scenario", "TestCaseName", "Test Name", "Tên test case", "Mô tả", "Description")
        method = normalize_method(pick(row, "Method", "HTTP Method", "Action", "Verb"))
        route = normalize_route(pick(row, "Route", "Endpoint", "API", "Path", "URL"), default_route, base_prefix)
        test_case = ImportedTestCase(
            test_case_id=pick(row, "TestCaseId", "Test Case ID", "ID", "Ma TC", "Mã TC") or f"Row{index}",
            scenario=scenario or f"Imported row {index}",
            method=method,
            route=route,
            input_text=pick(row, "Input", "Request", "Request Body", "Body", "Payload", "Dữ liệu test"),
            expected_status_code=pick(row, "ExpectedStatusCode", "StatusCode", "Expected Status", "HTTP Status") or "200",
            expected_result=pick(row, "ExpectedResult", "Expected", "Assert", "Kết quả mong đợi"),
            actor=pick(row, "Actor", "Role", "User Role"),
            protected=to_bool(pick(row, "Protected", "IsProtected", "AuthRequired", "RequireAuth")) or bool(pick(row, "Actor", "Role", "User Role")),
            business_rule=pick(row, "BusinessRule", "Rule", "BRD Rule", "AC"),
        )
        signature = imported_signature(test_case)
        if signature in seen:
            duplicate_count += 1
            if dedupe == "error":
                raise ValueError(f"Test case bị trùng tại dòng {index}: {test_case.test_case_id}")
            continue
        seen.add(signature)
        imported.append(test_case)

    return imported, duplicate_count


def build_imported_method(test_case: ImportedTestCase, used_names: set[str]) -> str:
    base_name = sanitize_identifier(test_case.test_case_id or test_case.scenario, "ImportedTest")
    method_name = base_name if base_name not in used_names else f"{base_name}_{len(used_names) + 1}"
    counter = 2
    while method_name in used_names:
        method_name = f"{base_name}_{counter}"
        counter += 1
    used_names.add(method_name)

    client = "_authorizedClient" if test_case.protected else "_anonymousClient"
    expected_status = status_code_expression(test_case.expected_status_code)
    request_object, is_raw_content = build_request_from_import(test_case.input_text)
    route_literal = test_case.route.replace("\\", "\\\\").replace('"', '\\"')
    expected_text = test_case.expected_result.replace("\\", "\\\\").replace('"', '\\"')
    rule_comment = f"\n        // Business rule/AC: {test_case.business_rule}" if test_case.business_rule else ""

    if test_case.method in {"POST", "PUT", "PATCH"}:
        sender = "PostAsync" if test_case.method == "POST" else "PutAsync" if test_case.method == "PUT" else "PatchAsync"
        if is_raw_content:
            request_lines = f"        using var request = {request_object};\n\n        var response = await {client}.{sender}(\"{route_literal}\", request);"
        else:
            request_lines = f"        var request = {request_object};\n\n        var response = await {client}.{sender.replace('Async', 'AsJsonAsync')}(\"{route_literal}\", request);"
    elif test_case.method == "DELETE":
        request_lines = f"        var response = await {client}.DeleteAsync(\"{route_literal}\");"
    else:
        request_lines = f"        var response = await {client}.GetAsync(\"{route_literal}\");"

    body_assertion = ""
    if expected_text:
        body_assertion = f"""
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("{expected_text}");"""

    return f"""
    [Fact]
    public async Task {method_name}()
    {{
        // Import từ test case {test_case.test_case_id}: {test_case.scenario}{rule_comment}
{request_lines}

        response.StatusCode.Should().Be({expected_status});{body_assertion}
    }}
"""


def build_imported_test_code(entity: str, test_cases: list[ImportedTestCase], namespace: str, design_reference: DesignReference | None = None) -> str:
    class_name = f"{pluralize(entity)}ImportedApiTests"
    has_protected_cases = any(test_case.protected for test_case in test_cases)
    used_names: set[str] = set()
    methods = "\n".join(build_imported_method(test_case, used_names) for test_case in test_cases).rstrip()
    design_summary = design_summary_lines(design_reference).rstrip()
    design_doc = design_summary if design_summary else ""
    factory_setup = """
        _authorizedClient = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureTestServices(services =>
            {
                services.AddAuthentication("Test")
                    .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("Test", _ => { });
            });
        }).CreateClient();
""" if has_protected_cases else "        _authorizedClient = _anonymousClient;\n"
    auth_support = """
public sealed class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public TestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Role, "STAFF")
        };
        var identity = new ClaimsIdentity(claims, "Test");
        var principal = new ClaimsPrincipal(identity);
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(principal, "Test")));
    }
}
""" if has_protected_cases else ""

    return f"""using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Encodings.Web;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Xunit;

namespace {namespace};

/// <summary>
/// Bộ kiểm thử contract import từ file test case truyền thống của QC.
{design_doc}
/// </summary>
public class {class_name} : IClassFixture<WebApplicationFactory<Program>>
{{
    private readonly HttpClient _anonymousClient;
    private readonly HttpClient _authorizedClient;

    public {class_name}(WebApplicationFactory<Program> factory)
    {{
        _anonymousClient = factory.CreateClient();
{factory_setup.rstrip()}
    }}

{methods}
}}

{auth_support}"""


def display_path(file_path: Path) -> str:
    try:
        return str(file_path.relative_to(REPO_ROOT))
    except ValueError:
        return str(file_path)


def write_test_file(entity: str, code: str, test_dir: Path, suffix: str = "ApiTests", overwrite: bool = False) -> Path:
    test_dir.mkdir(parents=True, exist_ok=True)
    file_path = test_dir / f"{pluralize(entity)}{suffix}.cs"
    if file_path.exists() and not overwrite:
        raise FileExistsError(f"Test đã tồn tại, không ghi đè tự động: {display_path(file_path)}")
    file_path.write_text(code, encoding="utf-8")
    return file_path


def main() -> int:
    args = parse_args()
    route = args.route or to_kebab_case(pluralize(args.entity))
    design_reference = build_design_reference(args)
    test_dir = Path(args.test_dir).expanduser().resolve()
    if args.testcase_file:
        test_cases, duplicate_count = import_test_cases(
            Path(args.testcase_file).expanduser().resolve(),
            args.sheet,
            route,
            args.base_prefix,
            args.dedupe,
        )
        if not test_cases:
            raise ValueError("Không có test case hợp lệ trong file import.")
        code = build_imported_test_code(args.entity, test_cases, args.namespace, design_reference)
        file_path = write_test_file(args.entity, code, test_dir, suffix="ImportedApiTests", overwrite=args.overwrite)
        print(f"[NHẬT KÝ QC] Đã import {len(test_cases)} test case vào: {display_path(file_path)}")
        print(f"[NHẬT KÝ QC] Đã bỏ qua {duplicate_count} test case trùng." if duplicate_count else "[NHẬT KÝ QC] Không phát hiện test case trùng.")
    else:
        actions = {action.strip() for action in args.actions.split(",") if action.strip()}
        properties = parse_properties(args.properties)
        code = build_test_code(args.entity, route, args.base_prefix, actions, properties, args.protected, args.namespace, design_reference)
        file_path = write_test_file(args.entity, code, test_dir, overwrite=args.overwrite)
        print(f"[NHẬT KÝ QC] Đã sinh test contract: {display_path(file_path)}")
    if design_reference:
        print(f"[NHẬT KÝ QC] Đã gắn trace design/Figma cho platform: {design_reference.platform}.")
    print("[NHẬT KÝ QC] Test dùng WebApplicationFactory; hãy bảo đảm test project có Microsoft.AspNetCore.Mvc.Testing.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
