import { describe, expect, it } from "vitest";

import { iniciais } from "./iniciais";

describe("iniciais", () => {
  it("usa as iniciais de duas palavras", () => {
    expect(iniciais("Ana Paula")).toBe("AP");
    expect(iniciais("  ana   paula silva ")).toBe("AP");
  });

  it("com uma palavra só, usa as duas primeiras letras", () => {
    expect(iniciais("Ana")).toBe("AN");
  });

  it("nome vazio não vira círculo em branco", () => {
    expect(iniciais("")).toBe("?");
    expect(iniciais("   ")).toBe("?");
  });
});
