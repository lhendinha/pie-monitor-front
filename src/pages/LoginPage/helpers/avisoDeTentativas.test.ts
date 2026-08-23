import { describe, expect, it } from "vitest";

import { ApiError } from "../../../services";
import { avisoDeTentativas } from "./avisoDeTentativas";

describe("avisoDeTentativas", () => {
  it("nas primeiras falhas, só o erro -- o servidor não manda contador", () => {
    // Quem errou a digitação uma vez não precisa de contagem regressiva.
    const r = avisoDeTentativas(new ApiError("Credenciais inválidas", 401));

    expect(r.erro).toBe("E-mail ou senha incorretos.");
    expect(r.alerta).toBeUndefined();
  });

  it("perto do limite, avisa quantas restam e por quanto tempo o bloqueio dura", () => {
    const r = avisoDeTentativas(
      new ApiError("Credenciais inválidas", 401, {
        tentativas_restantes: 2,
        bloqueio_minutos: 15,
      }),
    );

    expect(r.alerta).toBe("Restam 2 tentativas antes de o acesso ser bloqueado por 15 minutos.");
  });

  it("uma restante escreve no singular", () => {
    // "1 tentativa(s)" é gíria de programador vazando pra interface.
    const r = avisoDeTentativas(
      new ApiError("Credenciais inválidas", 401, {
        tentativas_restantes: 1,
        bloqueio_minutos: 15,
      }),
    );

    expect(r.alerta).toBe("Resta 1 tentativa antes de o acesso ser bloqueado por 15 minutos.");
  });

  it("zero restantes avisa que a próxima já é recusada e oferece a saída", () => {
    const r = avisoDeTentativas(
      new ApiError("Credenciais inválidas", 401, {
        tentativas_restantes: 0,
        bloqueio_minutos: 15,
      }),
    );

    expect(r.alerta).toContain("A próxima tentativa será recusada");
    expect(r.ofereceRecuperacao).toBe(true);
  });

  it("bloqueado (429) troca o erro pelo tempo de espera", () => {
    const r = avisoDeTentativas(
      new ApiError("Muitas tentativas de login.", 429, { retry_after_segundos: 900 }),
    );

    expect(r.erro).toBe("Muitas tentativas. Tente de novo em 15 minutos.");
    // Redefinir a senha destrava o login na hora, mesmo bloqueado -- é a
    // saída real, e sem o atalho ninguém a encontra.
    expect(r.ofereceRecuperacao).toBe(true);
  });

  it("menos de um minuto de espera arredonda pra 1, nunca pra 0", () => {
    // "Tente de novo em 0 minutos" é pior que não dizer nada.
    const r = avisoDeTentativas(
      new ApiError("Muitas tentativas de login.", 429, { retry_after_segundos: 20 }),
    );

    expect(r.erro).toBe("Muitas tentativas. Tente de novo em 1 minuto.");
  });

  it("erro que não é da API cai na mensagem genérica", () => {
    expect(avisoDeTentativas(new Error("rede caiu")).erro).toBe("E-mail ou senha incorretos.");
  });

  it("NUNCA revela se o e-mail existe", () => {
    // Controle: o servidor devolve o mesmo corpo pra conta real e
    // inexistente, e o contador sobe igual nos dois casos. Se algum dia
    // alguém puser o e-mail na mensagem, este teste cai.
    const r = avisoDeTentativas(
      new ApiError("Credenciais inválidas", 401, { tentativas_restantes: 2, bloqueio_minutos: 15 }),
    );

    for (const texto of [r.erro, r.alerta ?? ""]) {
      expect(texto).not.toMatch(/e-?mail (não )?(existe|cadastrad|encontrad)/i);
      expect(texto).not.toMatch(/senha (correta|errada|incorreta)\b/i);
    }
  });
});
