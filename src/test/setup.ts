import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Sem `test.globals: true` no vite.config.ts (de propósito -- evita poluir
// o namespace global com describe/it/expect implícitos), o React Testing
// Library não detecta o afterEach do Vitest sozinho e não limpa o DOM
// entre testes -- sem isso, um render() de um teste vaza pro próximo.
afterEach(() => {
  cleanup();
});
