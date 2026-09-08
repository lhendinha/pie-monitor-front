import { describe, expect, it } from "vitest";

import { contaDoLancamento, opcoesDeCategoria, opcoesDeCentro, opcoesDeConta } from "./catalogoFinanceiro";
import type { CatalogoFinanceiro, Lancamento } from "../types";

const CATALOGO = {
  contas: [
    { conta_id: "c1", nome: "Bradesco - honorários", tipo: "corrente", inicio: "2026-01-01",
      saldo_inicial_centavos: 0, saldo_centavos: 0, ativa: true },
    { conta_id: "c2", nome: "Caixa do escritório", tipo: "outros", inicio: "2026-01-01",
      saldo_inicial_centavos: 0, saldo_centavos: 0, ativa: true },
    { conta_id: "c3", nome: "Conta encerrada", tipo: "outros", inicio: "2026-01-01",
      saldo_inicial_centavos: 0, saldo_centavos: 0, ativa: false },
  ],
  categorias: [
    { categoria_id: "imp", nome: "Impostos", natureza: "saida", cor: "#d64550",
      agrupador_id: "", ativa: true },
    { categoria_id: "das", nome: "DAS", natureza: "saida", cor: "#d64550",
      agrupador_id: "imp", ativa: true },
    { categoria_id: "hon", nome: "Honorários", natureza: "entrada", cor: "#1f9d55",
      agrupador_id: "", ativa: true },
    { categoria_id: "velha", nome: "Categoria inativa", natureza: "saida", cor: "#d64550",
      agrupador_id: "", ativa: false },
  ],
  centros_de_custo: [
    { centro_id: "cc1", nome: "Filial BH", ativo: true },
    { centro_id: "cc2", nome: "Filial encerrada", ativo: false },
  ],
  conta_padrao_id: "c1",
  cores_disponiveis: [],
} as CatalogoFinanceiro;

const BASE = {
  lancamento_id: "l1", tipo: "saida", descricao: "DAS", valor_centavos: 1000,
  data_vencimento: "2026-09-20", situacao: "aberto", natureza: "saida",
  conta_id: "c1", categoria_id: "das", centro_id: "", rateio: [],
  cliente_id: "", contraparte: "Receita", subgrupo_id: "", numero_processo: "",
  atendimento_id: "", responsavel: "", documento_numero: "", parcela: "",
  criado_por: "x", criado_em: "2026-09-01T00:00:00Z",
} as Lancamento;

describe("contaDoLancamento", () => {
  it("no lançamento comum, é a conta dele", () => {
    expect(contaDoLancamento(BASE, CATALOGO)).toBe("Bradesco - honorários");
  });

  it("🔴 na TRANSFERÊNCIA, são as DUAS", () => {
    /* Ela não tem `conta_id` -- tem origem e destino. A coluna aparecia
       vazia justamente na linha em que a conta é a única coisa que importa,
       e foi assim que o defeito apareceu na tela. */
    const transferencia = {
      ...BASE, tipo: "transferencia", natureza: "", conta_id: "",
      conta_origem_id: "c1", conta_destino_id: "c2",
    } as Lancamento;
    expect(contaDoLancamento(transferencia, CATALOGO)).toBe(
      "Bradesco - honorários → Caixa do escritório",
    );
  });

  it("sem catálogo ainda, devolve vazio em vez do id cru", () => {
    expect(contaDoLancamento(BASE, undefined)).toBe("");
  });

  it("conta que sumiu do catálogo também vira vazio", () => {
    expect(contaDoLancamento({ ...BASE, conta_id: "fantasma" }, CATALOGO)).toBe("");
  });
});

describe("opcoesDeCategoria", () => {
  it("🔴 a AGRUPADORA fica de fora, e a filha mostra a mãe", () => {
    expect(opcoesDeCategoria(CATALOGO, "saida")).toEqual([
      { value: "das", label: "Impostos › DAS" },
    ]);
  });

  it("a natureza recorta -- o par negativo", () => {
    expect(opcoesDeCategoria(CATALOGO, "entrada")).toEqual([
      { value: "hon", label: "Honorários" },
    ]);
  });

  it("sem catálogo, lista vazia", () => {
    expect(opcoesDeCategoria(undefined, "saida")).toEqual([]);
  });
});

describe("opcoesDeConta e opcoesDeCentro", () => {
  it("a conta desativada não é oferecida", () => {
    expect(opcoesDeConta(CATALOGO).map((o) => o.label)).toEqual([
      "Bradesco - honorários",
      "Caixa do escritório",
    ]);
  });

  it("o centro abre com a linha de 'sem centro', e o inativo fica fora", () => {
    expect(opcoesDeCentro(CATALOGO)).toEqual([
      { value: "", label: "Sem centro de custo" },
      { value: "cc1", label: "Filial BH" },
    ]);
  });
});
