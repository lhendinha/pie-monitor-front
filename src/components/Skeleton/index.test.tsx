import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Skeleton from "./index";

describe("Skeleton", () => {
  it("renderiza 3 placeholders por padrão", () => {
    const { container } = render(<Skeleton />);
    expect(container.querySelectorAll(".docket-skeleton")).toHaveLength(3);
  });

  it("renderiza a quantidade de linhas pedida", () => {
    const { container } = render(<Skeleton linhas={5} />);
    expect(container.querySelectorAll(".docket-skeleton")).toHaveLength(5);
  });

  it("renderiza zero placeholders se linhas=0", () => {
    const { container } = render(<Skeleton linhas={0} />);
    expect(container.querySelectorAll(".docket-skeleton")).toHaveLength(0);
  });
});
