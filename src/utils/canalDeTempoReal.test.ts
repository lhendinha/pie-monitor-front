import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  assinarCanal,
  limparOuvintesDoCanal,
  publicarNoCanal,
} from "./canalDeTempoReal";
import type { MensagemDoCanal } from "../types";

const PROGRESSO: MensagemDoCanal = {
  tipo: "importacao_progresso",
} as MensagemDoCanal;

const NOTIFICACAO: MensagemDoCanal = { tipo: "notificacao" };

describe("barramento do canal de tempo real", () => {
  beforeEach(limparOuvintesDoCanal);

  it("entrega ao ouvinte do tipo pedido", () => {
    const ouviu = vi.fn();
    assinarCanal("importacao_progresso", ouviu);

    publicarNoCanal(PROGRESSO);

    expect(ouviu).toHaveBeenCalledWith(PROGRESSO);
  });

  it("NÃO entrega a quem assinou outro tipo", () => {
    /* 🔴 O par negativo que sustenta a trava do sino.
     *
     * Não existe assinante genérico, e é deliberado: um ouvinte "de tudo"
     * faria o progresso da importação -- que anda dezenas de vezes -- chegar
     * a quem só queria notificação. */
    const ouviu = vi.fn();
    assinarCanal("notificacao", ouviu);

    publicarNoCanal(PROGRESSO);

    expect(ouviu).not.toHaveBeenCalled();
  });

  it("entrega a todos os ouvintes do mesmo tipo", () => {
    const a = vi.fn();
    const b = vi.fn();
    assinarCanal("importacao_progresso", a);
    assinarCanal("importacao_progresso", b);

    publicarNoCanal(PROGRESSO);

    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
  });

  it("cancelar para de entregar", () => {
    const ouviu = vi.fn();
    const cancelar = assinarCanal("importacao_progresso", ouviu);

    cancelar();
    publicarNoCanal(PROGRESSO);

    expect(ouviu).not.toHaveBeenCalled();
  });

  it("cancelar um não afeta os outros", () => {
    const some = vi.fn();
    const fica = vi.fn();
    const cancelar = assinarCanal("importacao_progresso", some);
    assinarCanal("importacao_progresso", fica);

    cancelar();
    publicarNoCanal(PROGRESSO);

    expect(some).not.toHaveBeenCalled();
    expect(fica).toHaveBeenCalledOnce();
  });

  it("um ouvinte que estoura não leva os outros junto", () => {
    /* ⚠️ Mesmo motivo de `_criar_tolerando_falha` na API: uma exceção no
     * primeiro deixava os demais sem receber. O canal não é lugar de
     * propagar erro de tela. */
    vi.spyOn(console, "error").mockImplementation(() => {});
    const depois = vi.fn();
    assinarCanal("importacao_progresso", () => {
      throw new Error("tela quebrada");
    });
    assinarCanal("importacao_progresso", depois);

    expect(() => publicarNoCanal(PROGRESSO)).not.toThrow();
    expect(depois).toHaveBeenCalledOnce();
  });

  it("publicar sem ninguém ouvindo não quebra", () => {
    expect(() => publicarNoCanal(NOTIFICACAO)).not.toThrow();
  });

  it("assinar durante a entrega não recebe a mensagem em curso", () => {
    /* ⚠️ A cópia do conjunto antes do laço é o que garante isso -- sem ela,
     * assinar dentro de um ouvinte alteraria a coleção sendo percorrida. */
    const tardio = vi.fn();
    assinarCanal("importacao_progresso", () => {
      assinarCanal("importacao_progresso", tardio);
    });

    expect(() => publicarNoCanal(PROGRESSO)).not.toThrow();
    expect(tardio).not.toHaveBeenCalled();
  });
});
