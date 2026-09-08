import { describe, expect, it } from "vitest";

import { camposAlteradosDoLancamento } from "./lancamentos";
import type { Lancamento } from "../types";
import type { CamposEditaveisDoLancamento } from "../types/financeiro";

const GRAVADO = {
  lancamento_id: "l1",
  tipo: "honorario",
  descricao: "Honorários",
  valor_centavos: 250000,
  data_vencimento: "2026-09-20",
  situacao: "aberto",
  natureza: "entrada",
  conta_id: "ct1",
  categoria_id: "cat1",
  centro_id: "",
  rateio: [{ subgrupo_id: "s1", valor_centavos: 250000 }],
  cliente_id: "",
  contraparte: "Construtora Alfa",
  subgrupo_id: "s1",
  numero_processo: "",
  atendimento_id: "",
  responsavel: "ana@x.com",
  documento_numero: "",
  parcela: "",
  criado_por: "ana@x.com",
  criado_em: "2026-09-01T10:00:00Z",
} as Lancamento;

/** O formulário recém-montado: espelho exato do que está gravado. */
const INTOCADO: CamposEditaveisDoLancamento = {
  descricao: "Honorários",
  dataVencimento: "2026-09-20",
  valorCentavos: 250000,
  contraparte: "Construtora Alfa",
  documento: "",
  categoriaId: "cat1",
  centroId: "",
  contaId: "ct1",
  responsavel: "ana@x.com",
  rateio: [{ subgrupo_id: "s1", valor_centavos: 250000 }],
};

describe("camposAlteradosDoLancamento", () => {
  it("🔴 nada mudou: corpo VAZIO", () => {
    /* É o que faz a tela nem chamar o servidor -- e o que impede o `PATCH`
       de rodar as réguas de conta, categoria e centro à toa. */
    expect(camposAlteradosDoLancamento(GRAVADO, INTOCADO)).toEqual({});
  });

  it("🔴 a cópia das parcelas não conta como mudança", () => {
    /* O formulário copia o rateio ao montar (`.map(p => ({...p}))`), e uma
       comparação por identidade diria "mudou" a cada render -- mandando
       valor e rateio em todo salvamento. */
    const copiado = { ...INTOCADO, rateio: GRAVADO.rateio.map((p) => ({ ...p })) };
    expect(camposAlteradosDoLancamento(GRAVADO, copiado)).toEqual({});
  });

  it("manda só o campo tocado", () => {
    expect(
      camposAlteradosDoLancamento(GRAVADO, { ...INTOCADO, descricao: "Honorários · corrigido" }),
    ).toEqual({ descricao: "Honorários · corrigido" });
  });

  it("apara espaço antes de comparar -- espaço no fim não é edição", () => {
    expect(camposAlteradosDoLancamento(GRAVADO, { ...INTOCADO, descricao: "Honorários  " }))
      .toEqual({});
  });

  it("🔴 mudar o VALOR leva o rateio junto", () => {
    const campos = camposAlteradosDoLancamento(GRAVADO, {
      ...INTOCADO,
      valorCentavos: 300000,
    });
    expect(campos.valor_centavos).toBe(300000);
    expect(campos.rateio).toEqual([{ subgrupo_id: "s1" }]);
  });

  it("🔴 e mudar o RATEIO leva o valor junto -- o outro lado", () => {
    const campos = camposAlteradosDoLancamento(GRAVADO, {
      ...INTOCADO,
      rateio: [
        { subgrupo_id: "s1", valor_centavos: 150000 },
        { subgrupo_id: "s2", valor_centavos: 100000 },
      ],
    });
    expect(campos.valor_centavos).toBe(250000);
    expect(campos.rateio).toEqual([
      { subgrupo_id: "s1", valor_centavos: 150000 },
      { subgrupo_id: "s2", valor_centavos: 100000 },
    ]);
  });

  it("⚠️ a parcela ÚNICA vai SEM valor", () => {
    /* Ali o valor só pode ser o do lançamento; mandá-lo de novo criaria duas
       fontes para o mesmo número. */
    const campos = camposAlteradosDoLancamento(GRAVADO, { ...INTOCADO, valorCentavos: 1 });
    expect(campos.rateio).toEqual([{ subgrupo_id: "s1" }]);
  });

  it("trocar o departamento sem mexer no valor também manda os dois", () => {
    const campos = camposAlteradosDoLancamento(GRAVADO, {
      ...INTOCADO,
      rateio: [{ subgrupo_id: "s2", valor_centavos: 250000 }],
    });
    expect(campos.rateio).toEqual([{ subgrupo_id: "s2" }]);
    expect(campos.valor_centavos).toBe(250000);
  });

  it("esvaziar um campo opcional É uma mudança", () => {
    /* Par negativo de "só o que mudou": vazio não é ausente. */
    const comCentro = { ...GRAVADO, centro_id: "cc1" } as Lancamento;
    expect(camposAlteradosDoLancamento(comCentro, INTOCADO)).toEqual({ centro_id: "" });
  });
});
