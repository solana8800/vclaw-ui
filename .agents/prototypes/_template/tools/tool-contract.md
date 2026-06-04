# Tool Contract

Mo ta tool ma prototype duoc phep goi. Neu prototype dung mock hoac sandbox adapter, ghi ro response mau va gioi han hanh dong.

## Allowed Tools

| Tool | Purpose | Read/Write | Data Boundary | Failure Behavior |
| --- | --- | --- | --- | --- |
| `<tool.name>` | `<why needed>` | `<read/write>` | `<data allowed>` | `<fallback/escalation>` |

## Forbidden Actions

- `<production write>`
- `<real payment>`
- `<medical decision>`
- `<PII export>`

## Mock Or Sandbox Notes

```text
<fixture, mock endpoint, sandbox database, or adapter notes>
```
