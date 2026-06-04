#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Công cụ sinh khung code Clean Architecture cho .NET adapter.
Khung sinh ra là điểm bắt đầu; agent vẫn phải đọc test và hoàn thiện wiring/logic.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[4]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sinh khung code Clean Architecture cho .NET project.")
    parser.add_argument("--entity", required=True, help="Tên thực thể bằng tiếng Anh, ví dụ MealRating.")
    parser.add_argument("--properties", required=True, help="Danh sách Field:Type ngăn cách bằng dấu phẩy.")
    parser.add_argument("--route", help="Route API. Nếu bỏ trống sẽ dùng kebab-case plural của entity.")
    parser.add_argument("--base-prefix", default="/api", help="Prefix API lấy từ project context; mặc định portable là /api.")
    parser.add_argument("--style", choices=["minimal-api", "controller"], default="minimal-api", help="Kiểu API cần sinh.")
    parser.add_argument("--protected", action="store_true", help="Sinh endpoint có RequireAuthorization.")
    parser.add_argument("--root-namespace", required=True, help="Namespace root của project, lấy từ project context.")
    parser.add_argument("--domain-dir", required=True, help="Thư mục entity domain output, lấy từ project context.")
    parser.add_argument("--application-dir", required=True, help="Thư mục application feature output, lấy từ project context.")
    parser.add_argument("--api-endpoint-dir", help="Thư mục Minimal API endpoint output, lấy từ project context.")
    parser.add_argument("--api-controller-dir", help="Thư mục controller output, lấy từ project context.")
    return parser.parse_args()


def parse_properties(raw_properties: str) -> list[tuple[str, str]]:
    properties: list[tuple[str, str]] = []
    for item in raw_properties.split(","):
        if ":" not in item:
            continue
        name, type_name = item.split(":", 1)
        properties.append((name.strip(), type_name.strip()))
    return properties


def pluralize(value: str) -> str:
    if value.endswith("y"):
        return f"{value[:-1]}ies"
    if value.endswith("s"):
        return value
    return f"{value}s"


def to_kebab_case(value: str) -> str:
    words = re.sub("([a-z0-9])([A-Z])", r"\1-\2", value).replace("_", "-")
    return words.lower()


def default_value(type_name: str) -> str:
    normalized = type_name.strip().lower()
    if normalized == "string":
        return " = string.Empty;"
    if normalized.startswith("list<") or normalized.endswith("[]"):
        return " = [];"
    return ""


def validator_rule(name: str, type_name: str) -> str:
    normalized = type_name.lower().rstrip("?")
    if normalized == "string":
        return f'        RuleFor(x => x.{name}).NotEmpty().WithMessage("{name} là thông tin bắt buộc.");'
    if normalized in {"guid"}:
        return f'        RuleFor(x => x.{name}).NotEmpty().WithMessage("{name} là thông tin bắt buộc.");'
    if normalized in {"int", "int32", "long", "int64", "decimal", "double"}:
        return f'        RuleFor(x => x.{name}).GreaterThanOrEqualTo(0).WithMessage("{name} không được nhỏ hơn 0.");'
    return f"        // Kiểm tra thêm {name} theo Acceptance Criteria trước khi release."


def build_entity(entity: str, properties: list[tuple[str, str]], root_namespace: str) -> str:
    property_lines = "\n".join(
        f"    public {type_name} {name} {{ get; set; }}{default_value(type_name)}"
        for name, type_name in properties
    )
    return f"""using {root_namespace}.Domain.Common;

namespace {root_namespace}.Domain.Entities;

/// <summary>
/// Thực thể {entity} phục vụ nghiệp vụ theo yêu cầu đã đối chiếu.
/// </summary>
public class {entity} : BaseEntity
{{
{property_lines}
}}
"""


def build_feature(entity: str, properties: list[tuple[str, str]], root_namespace: str) -> str:
    feature = pluralize(entity)
    ctor_params = ", ".join(f"{type_name} {name}" for name, type_name in properties)
    dto_params = ", ".join(["Guid Id", *[f"{type_name} {name}" for name, type_name in properties], "DateTime CreatedAt"])
    mapping_args = ", ".join(["entity.Id", *[f"entity.{name}" for name, _ in properties], "entity.CreatedAt"])
    assignment_lines = "\n".join(f"            {name} = cmd.{name}," for name, _ in properties)
    validator_lines = "\n".join(validator_rule(name, type_name) for name, type_name in properties)

    return f"""using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using {root_namespace}.Application.Common;
using {root_namespace}.Application.Interfaces;
using {root_namespace}.Domain.Entities;

namespace {root_namespace}.Application.Features.{feature};

public sealed record {entity}Dto({dto_params});

public sealed record Create{entity}Command({ctor_params}) : IRequest<ApiResponse<{entity}Dto>>;

public sealed record Get{entity}Query(Guid Id) : IRequest<ApiResponse<{entity}Dto>>;

public sealed class Create{entity}Validator : AbstractValidator<Create{entity}Command>
{{
    public Create{entity}Validator()
    {{
{validator_lines}
    }}
}}

public sealed class Create{entity}Handler(IAppDbContext db)
    : IRequestHandler<Create{entity}Command, ApiResponse<{entity}Dto>>
{{
    public async Task<ApiResponse<{entity}Dto>> Handle(Create{entity}Command cmd, CancellationToken ct)
    {{
        var validator = new Create{entity}Validator();
        var validation = await validator.ValidateAsync(cmd, ct);
        if (!validation.IsValid)
        {{
            return ApiResponse<{entity}Dto>.Fail(
                "Dữ liệu gửi lên chưa hợp lệ.",
                validation.Errors.Select(error => error.ErrorMessage));
        }}

        var entity = new {entity}
        {{
{assignment_lines}
        }};

        db.{feature}.Add(entity);
        await db.SaveChangesAsync(ct);

        return ApiResponse<{entity}Dto>.Created(entity.ToDto());
    }}
}}

public sealed class Get{entity}Handler(IAppDbContext db)
    : IRequestHandler<Get{entity}Query, ApiResponse<{entity}Dto>>
{{
    public async Task<ApiResponse<{entity}Dto>> Handle(Get{entity}Query query, CancellationToken ct)
    {{
        var entity = await db.{feature}
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == query.Id, ct);

        return entity is null
            ? ApiResponse<{entity}Dto>.NotFound()
            : ApiResponse<{entity}Dto>.Ok(entity.ToDto());
    }}
}}

internal static class {entity}Mappings
{{
    public static {entity}Dto ToDto(this {entity} entity)
        => new({mapping_args});
}}
"""


def build_minimal_endpoint(entity: str, route: str, base_prefix: str, protected: bool, root_namespace: str) -> str:
    feature = pluralize(entity)
    auth_line = "\n        group.RequireAuthorization();" if protected else ""
    return f"""using MediatR;
using {root_namespace}.Application.Features.{feature};

namespace {root_namespace}.Api.Endpoints;

public static class {feature}Endpoints
{{
    public static IEndpointRouteBuilder Map{feature}Endpoints(this IEndpointRouteBuilder app)
    {{
        var group = app.MapGroup("{base_prefix.rstrip('/')}/{route.strip('/')}")
            .WithTags("{feature}");
{auth_line}

        group.MapPost("/", async (Create{entity}Command command, IMediator mediator, CancellationToken ct) =>
        {{
            // Controller mỏng: mọi nghiệp vụ được xử lý trong Application Layer.
            var result = await mediator.Send(command, ct);
            return result.Success
                ? Results.Created($"{base_prefix.rstrip('/')}/{route.strip('/')}/{{result.Data!.Id}}", result)
                : Results.BadRequest(result);
        }});

        group.MapGet("/{{id:guid}}", async (Guid id, IMediator mediator, CancellationToken ct) =>
        {{
            var result = await mediator.Send(new Get{entity}Query(id), ct);
            return result.Success ? Results.Ok(result) : Results.NotFound(result);
        }});

        return app;
    }}
}}
"""


def build_controller(entity: str, route: str, base_prefix: str, protected: bool, root_namespace: str) -> str:
    feature = pluralize(entity)
    authorize_using = "using Microsoft.AspNetCore.Authorization;\n" if protected else ""
    authorize_attr = "[Authorize]\n" if protected else ""
    return f"""using MediatR;
{authorize_using}using Microsoft.AspNetCore.Mvc;
using {root_namespace}.Application.Features.{feature};

namespace {root_namespace}.Api.Controllers;

/// <summary>
/// API nhận yêu cầu liên quan đến nghiệp vụ {entity}.
/// </summary>
[ApiController]
{authorize_attr}[Route("{base_prefix.strip('/')}/{route.strip('/')}")]
public class {feature}Controller(IMediator mediator) : ControllerBase
{{
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Create{entity}Command command, CancellationToken cancellationToken)
    {{
        // Điều phối sang Application Layer để giữ controller mỏng và dễ kiểm thử.
        var result = await mediator.Send(command, cancellationToken);
        return result.Success
            ? Created($"{base_prefix.rstrip('/')}/{route.strip('/')}/{{result.Data!.Id}}", result)
            : BadRequest(result);
    }}

    [HttpGet("{{id:guid}}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {{
        var result = await mediator.Send(new Get{entity}Query(id), cancellationToken);
        return result.Success ? Ok(result) : NotFound(result);
    }}
}}
"""


def build_wiring_notes(entity: str, route: str, base_prefix: str, style: str, root_namespace: str) -> str:
    feature = pluralize(entity)
    endpoint_line = f"app.Map{feature}Endpoints();" if style == "minimal-api" else "Controller route được map qua controller discovery nếu AddControllers/MapControllers đang bật."
    return f"""# {entity} Wiring Notes

Các file scaffold đã được sinh để agent hoàn thiện theo test và yêu cầu dự án.

## Việc bắt buộc trước khi claim hoàn tất

- Thêm `DbSet<{entity}> {feature} {{ get; }}` vào `{root_namespace}.Application/Interfaces/IAppDbContext.cs`.
- Thêm `DbSet<{entity}> {feature} {{ get; set; }}` vào `{root_namespace}.Infrastructure/Persistence/AppDbContext.cs`.
- Đăng ký endpoint trong `{root_namespace}.Api/Program.cs`: `{endpoint_line}`
- Kiểm tra route contract: `{base_prefix.rstrip('/')}/{route.strip('/')}`.
- Bổ sung relationship/index/unique constraint trong `OnModelCreating` nếu BRD có business key.
- Chạy test contract do `$qc_agent` sinh trước khi sửa test.
- Chạy build/test command tương ứng trong project context.
"""


def display_path(file_path: Path) -> str:
    try:
        return str(file_path.relative_to(REPO_ROOT))
    except ValueError:
        return str(file_path)


def write_file(file_path: Path, content: str) -> None:
    file_path.parent.mkdir(parents=True, exist_ok=True)
    if file_path.exists():
        print(f"[CẢNH BÁO] Bỏ qua file đã tồn tại để tránh ghi đè: {display_path(file_path)}")
        return
    file_path.write_text(content, encoding="utf-8")
    print(f"[NHẬT KÝ] Đã sinh file: {display_path(file_path)}")


def main() -> int:
    args = parse_args()
    if args.style == "minimal-api" and not args.api_endpoint_dir:
        raise SystemExit("Thiếu --api-endpoint-dir. Hãy khai báo trong project context hoặc truyền trực tiếp.")
    if args.style == "controller" and not args.api_controller_dir:
        raise SystemExit("Thiếu --api-controller-dir. Hãy khai báo trong project context hoặc truyền trực tiếp.")

    properties = parse_properties(args.properties)
    if not properties:
        raise ValueError("Danh sách properties phải có dạng Field:Type.")

    entity = args.entity
    feature = pluralize(entity)
    route = args.route or to_kebab_case(feature)
    domain_dir = Path(args.domain_dir).expanduser().resolve()
    application_dir = Path(args.application_dir).expanduser().resolve()
    api_endpoint_dir = Path(args.api_endpoint_dir).expanduser().resolve() if args.api_endpoint_dir else None
    api_controller_dir = Path(args.api_controller_dir).expanduser().resolve() if args.api_controller_dir else None

    write_file(domain_dir / f"{entity}.cs", build_entity(entity, properties, args.root_namespace))
    write_file(application_dir / feature / f"{feature}Feature.cs", build_feature(entity, properties, args.root_namespace))
    if args.style == "minimal-api":
        assert api_endpoint_dir is not None
        write_file(api_endpoint_dir / f"{feature}Endpoints.cs", build_minimal_endpoint(entity, route, args.base_prefix, args.protected, args.root_namespace))
    else:
        assert api_controller_dir is not None
        write_file(api_controller_dir / f"{feature}Controller.cs", build_controller(entity, route, args.base_prefix, args.protected, args.root_namespace))
    write_file(application_dir / feature / "WIRING-NOTES.md", build_wiring_notes(entity, route, args.base_prefix, args.style, args.root_namespace))

    print("[NHẬT KÝ] Khung code đã sẵn sàng; agent phải hoàn thiện DbContext, Program.cs, authorization và test theo BRD.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
