import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CandidateResumeMarkdown } from "@/components/recruitment/candidate-resume-markdown";

describe("CandidateResumeMarkdown", () => {
  it("renders heading and bold list item", () => {
    render(
      <CandidateResumeMarkdown content={"## Kinh nghiệm\n\n- **Dev** tại A"} />,
    );
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Kinh nghiệm");
    expect(screen.getByText("Dev")).toBeInTheDocument();
  });
});
