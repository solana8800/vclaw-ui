# Agent Prototype Registry

Thu muc nay chua artifact cho prototype theo ADLC portable.

Prototype o day khong phai UI demo hay ban code nhap de dua thang len production. Prototype la mot ban chay thu co scope hep, dung du lieu dai dien de do accuracy, hallucination, safety, latency, cost va tool behavior truoc khi quyet dinh `GO`, `NO-GO` hoac `ITERATE`.

## Khi nao tao prototype

Tao prototype khi feature co LLM, agent, RAG, memory, prompt routing, tool calling, autonomous action hoac AI decision support va con gia thuyet rui ro cao can kiem chung.

Khong can tao prototype cho CRUD/API thong thuong, docs, refactor nho, bugfix deterministic, hoac UI khong co AI behavior.

## Cau truc thu muc

Moi prototype dat trong:

```text
.agents/prototypes/<feature-slug>/
```

Bat dau bang cach copy `_template/` thanh thu muc moi va dien cac file can thiet.

```text
.agents/prototypes/<feature-slug>/
  README.md
  cases/
    golden-cases.jsonl
  runs/
    run-report.md
  prompts/
    system-prompt.md
  tools/
    tool-contract.md
```

## Quy tac an toan

- Khong commit PII that, regulated data, token, password, connection string hoac thong tin thanh toan day du.
- Dung fixture, mock, sandbox database hoac du lieu da khu PII.
- Prototype khong duoc tac dong production system, gui thong bao that, tao giao dich that hoac ghi du lieu that neu chua qua Security va Release.
- Neu can dung du lieu nhay cam de danh gia, phai co phe duyet bao mat va ghi ro trong README cua prototype.

## Dieu kien chuyen sang production implementation

Prototype chi duoc chuyen sang implementation khi co:

- Hypothesis va scope ro rang.
- Human-agent boundary ro rang.
- Golden cases hoac eval rubric du dai dien.
- Run report co baseline accuracy/quality, hallucination hoac unsafe-response rate, tool error rate, latency va cost estimate.
- Decision `GO` kem dieu kien tiep theo.

Neu thieu cac artifact tren, ket qua chi duoc xem la internal preview hoac experiment.
