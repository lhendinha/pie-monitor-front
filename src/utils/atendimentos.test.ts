import { describe, expect, it } from "vitest";

import { STATUS_EM_ANDAMENTO, STATUS_FECHADO } from "../constants";
import { camposAlteradosDoAtendimento, ehStatusDeAtendimento } from "./atendimentos";

/** O atendimento como está gravado. */
const GRAVADO = {
  assunto: "Revisão de contrato",
  status: STATUS_EM_ANDAMENTO as string,
  responsaveis: ["ana@x.test"],
};

describe("ehStatusDeAtendimento", () => {
  it("aceita os dois do vocabulário", () => {
    expect(ehStatusDeAtendimento(STATUS_EM_ANDAMENTO)).toBe(true);
    expect(ehStatusDeAtendimento(STATUS_FECHADO)).toBe(true);
  });

  it("recusa o que não é status -- inclusive o vazio e a variação de caixa", () => {
    expect(ehStatusDeAtendimento("Arquivado")).toBe(false);
    expect(ehStatusDeAtendimento("")).toBe(false);
    expect(ehStatusDeAtendimento("em andamento")).toBe(false);
  });
});

describe("camposAlteradosDoAtendimento", () => {
  it("nada mudou -> corpo vazio", () => {
    expect(camposAlteradosDoAtendimento(GRAVADO, { ...GRAVADO })).toEqual({});
  });

  it("só o assunto mudou -> só o assunto vai", () => {
    const corpo = camposAlteradosDoAtendimento(GRAVADO, { ...GRAVADO, assunto: "Outro" });
    expect(corpo).toEqual({ assunto: "Outro" });
    expect("status" in corpo).toBe(false);
  });

  it("só o status mudou -> só o status vai", () => {
    expect(camposAlteradosDoAtendimento(GRAVADO, { ...GRAVADO, status: STATUS_FECHADO }))
      .toEqual({ status: STATUS_FECHADO });
  });

  it("os três mudaram -> os três vão, num corpo só", () => {
    expect(
      camposAlteradosDoAtendimento(GRAVADO, {
        assunto: "Outro",
        status: STATUS_FECHADO,
        responsaveis: ["bia@x.test"],
      }),
    ).toEqual({ assunto: "Outro", status: STATUS_FECHADO, responsaveis: ["bia@x.test"] });
  });

  it("lista REORDENADA conta como mudança -- o mais seguro dos dois erros", () => {
    const antes = { ...GRAVADO, responsaveis: ["ana@x.test", "bia@x.test"] };
    const depois = { ...antes, responsaveis: ["bia@x.test", "ana@x.test"] };
    expect(camposAlteradosDoAtendimento(antes, depois))
      .toEqual({ responsaveis: ["bia@x.test", "ana@x.test"] });
  });

  it("esvaziar a lista de responsáveis VAI -- quem recusa é o servidor", () => {
    /* O front não decide isso sozinho: o campo está na tela, a pessoa vê o
       que fez, e a régua de "vazio na edição é engano" mora na API. */
    expect(camposAlteradosDoAtendimento(GRAVADO, { ...GRAVADO, responsaveis: [] }))
      .toEqual({ responsaveis: [] });
  });

  describe("🔴 status que este front não conhece", () => {
    const COM_DESCONHECIDO = { ...GRAVADO, status: "Arquivado" };

    it("editar o assunto NÃO devolve o status desconhecido", () => {
      /* Era o defeito: o formulário mandava os três, a API respondia 400
         "Status inválido", e o atendimento ficava impossível de editar --
         com o erro apontando um campo que a pessoa nem tocou. */
      const corpo = camposAlteradosDoAtendimento(COM_DESCONHECIDO, {
        ...COM_DESCONHECIDO,
        assunto: "Assunto corrigido",
      });
      expect(corpo).toEqual({ assunto: "Assunto corrigido" });
    });

    it("e escolher um status válido volta a andar", () => {
      expect(
        camposAlteradosDoAtendimento(COM_DESCONHECIDO, {
          ...COM_DESCONHECIDO,
          status: STATUS_FECHADO,
        }),
      ).toEqual({ status: STATUS_FECHADO });
    });

    it("um desconhecido NUNCA sai, nem quando é o valor 'novo'", () => {
      /* Pela tela não dá -- o `Select` só oferece os dois --, mas o corpo é
         montado aqui, e é aqui que a garantia tem de valer. */
      expect(
        camposAlteradosDoAtendimento(GRAVADO, { ...GRAVADO, status: "Arquivado" }),
      ).toEqual({});
    });
  });
});
