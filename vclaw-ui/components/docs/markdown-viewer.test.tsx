import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MarkdownViewer } from "@/components/docs/markdown-viewer";

describe("MarkdownViewer", () => {
  it("renders headings and links", () => {
    render(
      <MarkdownViewer content={"# Hello VClaw\n\n[Read docs](/docs)"} />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Hello VClaw" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Read docs" })).toHaveAttribute(
      "href",
      "/docs",
    );
  });

  it("renders tables and fenced code blocks", () => {
    render(
      <MarkdownViewer
        content={
          "| Name | Value |\n| --- | --- |\n| VClaw | Ready |\n\n```ts\nconst app = 'vclaw';\n```"
        }
      />,
    );

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("const app = 'vclaw';")).toBeInTheDocument();
  });

  it("renders fenced code blocks without nested pre elements", () => {
    const html = renderToStaticMarkup(
      <MarkdownViewer content={"```ts\nconst app = 'vclaw';\n```"} />,
    );

    expect(html).toContain("<pre");
    expect(html).not.toContain("<pre><pre");
  });

  it("nhận diện fenced ```mermaid và dùng MermaidBlock (không bọc bằng <pre> style khối code thường)", () => {
    const { container } = render(
      <MarkdownViewer
        content={"```mermaid\ngraph TD\n  A-->B\n```"}
      />,
    );

    const pre = container.querySelector("pre");
    expect(pre).toBeTruthy();
    // Khối code fenced thường dùng my-8 p-5; placeholder của MermaidBlock không dùng my-8.
    expect(pre?.className.includes("my-8")).toBe(false);
    expect(container.textContent).toContain("graph TD");
  });
});
