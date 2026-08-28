import { describe, expect, it } from "vitest";

import { camposAlterados, corpoDosCamposDeProcesso } from "./processos";
import { CAMPOS_DO_CORPO_DE_PROCESSO } from "../constants/processo";

/** O corpo do salvamento de processo.
 *
 * 🔴 Estes testes existem por uma perda de dado real: a função escrevia
 * `campos.clienteIds || []` para os nove campos, sempre. O "PATCH" era
 * sobrescrita total, e o formulário de edição -- que nunca semeou
 * `responsaveis` -- mandava a lista vazia em TODO salvamento.
 *
 * A régua que estes testes fixam é a convenção do servidor: **campo ausente
 * = não toque; campo presente = grave isto, inclusive vazio.**
 */

describe("o corpo dos campos de processo", () => {
  it("🔴 OMITE o que não foi informado -- não manda vazio", () => {
    /* O par negativo do defeito: sem isto, um campo que o formulário
       esqueceu de carregar chega ao servidor como "apague". */
    expect(corpoDosCamposDeProcesso({ objetoAssunto: "posse" })).toEqual({
      objeto_assunto: "posse",
    });
  });

  it("manda o VAZIO quando ele foi informado -- é o que limpa", () => {
    /* ⚠️ O par do teste acima, e a diferença que dá sentido aos dois:
       `undefined` é "não enviei"; `[]`/`""` é "quero limpar". */
    expect(corpoDosCamposDeProcesso({ clienteIds: [], observacoes: "" })).toEqual({
      cliente_ids: [],
      observacoes: "",
    });
  });

  it("traduz os nomes para os da API", () => {
    expect(
      corpoDosCamposDeProcesso({ clienteIds: ["c1"], proximaProvidencia: "x", faseId: "f" }),
    ).toEqual({ cliente_ids: ["c1"], proxima_providencia: "x", fase_id: "f" });
  });

  it("com nada informado, corpo vazio -- e não nove campos zerados", () => {
    expect(corpoDosCamposDeProcesso({})).toEqual({});
  });

  it("cobre TODOS os campos da constante", () => {
    /* 🔴 O guarda contra o campo novo esquecido: quem acrescentar um item em
       `CAMPOS_DO_CORPO_DE_PROCESSO` e não o tratar aqui é pego. */
    const tudo = Object.fromEntries(
      CAMPOS_DO_CORPO_DE_PROCESSO.map(([chave]) => [chave, "x"]),
    );
    const corpo = corpoDosCamposDeProcesso(tudo);

    expect(Object.keys(corpo).sort()).toEqual(
      CAMPOS_DO_CORPO_DE_PROCESSO.map(([, api]) => api).sort(),
    );
  });
});

describe("só o que mudou", () => {
  const original = {
    clienteIds: ["c1"],
    responsaveis: ["eu@x.com"],
    objetoAssunto: "posse",
    faseId: "f1",
  };

  it("devolve apenas o campo tocado", () => {
    expect(camposAlterados(original, { ...original, objetoAssunto: "usucapião" })).toEqual({
      objetoAssunto: "usucapião",
    });
  });

  it("nada mudou, nada vai", () => {
    /* 🔴 É o que impede devolver por cima o que outra pessoa alterou
       enquanto esta tela estava aberta. */
    expect(camposAlterados(original, { ...original })).toEqual({});
  });

  it("compara lista por CONTEÚDO, não por referência", () => {
    /* Sem isto, todo salvamento reenviaria as duas listas -- e reenviar
       responsáveis inalterados faz o servidor rodar a régua de "tirar OUTRA
       pessoa" à toa. */
    expect(camposAlterados(original, { ...original, clienteIds: ["c1"] })).toEqual({});
  });

  it("esvaziar uma lista CONTA como mudança", () => {
    /* ⚠️ O par que faz o "salvar sem responsável" chegar ao servidor: se o
       vazio fosse tratado como ausência, a limpeza nunca sairia da tela. */
    expect(camposAlterados(original, { ...original, responsaveis: [] })).toEqual({
      responsaveis: [],
    });
  });

  it("acrescentar item na lista conta", () => {
    expect(camposAlterados(original, { ...original, clienteIds: ["c1", "c2"] })).toEqual({
      clienteIds: ["c1", "c2"],
    });
  });

  it("campo que quem chama não tem é ignorado", () => {
    /* `undefined` no atual não é "limpar" -- é "não sei". A rede de
       segurança de `corpoDosCamposDeProcesso`, um nível acima. */
    expect(camposAlterados(original, { objetoAssunto: "posse" })).toEqual({});
  });
});
