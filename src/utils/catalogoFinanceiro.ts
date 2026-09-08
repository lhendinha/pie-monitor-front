import type { CatalogoFinanceiro, Lancamento, Membro, OpcaoDeSelect } from "../types";

/* 🔴 Mora em `utils/`, e não na pasta da página: os quatro formulários de
   lançamento e a tela de detalhe montam as MESMAS listas, e a página do
   Financeiro não é dona delas -- a Fase 6 (faturas e fluxo) vai pedir as
   mesmas. Mesma régua de `utils/opcoesEscolhidas.ts`. */

/** As categorias que um lançamento desta natureza pode usar.
 *
 * 🔴 **A AGRUPADORA fica de fora.** Ela não aceita lançamento -- só soma as
 * filhas --, e o servidor recusa com "Categoria inválida". Oferecê-la seria
 * pôr no select a única opção que não funciona.
 *
 * 🔴 **E a natureza tem de bater.** Uma saída com categoria de entrada faz o
 * fluxo de caixa se contradizer: a linha aparece como saída e o total soma em
 * entradas. O servidor confere; a tela nem oferece.
 *
 * ⚠️ **A filha aparece como "Agrupadora › Filha"**, como no artefato: fora do
 * contexto da lista hierárquica, "DAS" sozinho não diz que é imposto.
 *
 * ⚠️ Inativa fica de fora: ela existe para o histórico não perder o nome, não
 * para receber lançamento novo.
 */
export function opcoesDeCategoria(
  catalogo: CatalogoFinanceiro | undefined,
  natureza: string,
): OpcaoDeSelect[] {
  const categorias = catalogo?.categorias ?? [];
  const nomePorId = new Map(categorias.map((c) => [c.categoria_id, c.nome]));
  const agrupadoras = new Set(categorias.map((c) => c.agrupador_id).filter(Boolean));
  return categorias
    .filter((c) => c.ativa && c.natureza === natureza && !agrupadoras.has(c.categoria_id))
    .map((c) => ({
      value: c.categoria_id,
      label: c.agrupador_id
        ? `${nomePorId.get(c.agrupador_id) ?? ""} › ${c.nome}`.replace(/^ › /, "")
        : c.nome,
    }));
}

/** As contas em que o dinheiro pode entrar ou sair.
 *
 * ⚠️ Desativada fica de fora: o servidor responde "Conta desativada: escolha
 * outra", e a tela não deve oferecer o que ele nega.
 *
 * ⚠️ **Diferente do FILTRO da lista**, que inclui as inativas de propósito --
 * lá a pergunta é "quais lançamentos usaram esta conta", e um lançamento
 * antigo aponta para uma conta desativada. Aqui a pergunta é "onde este
 * dinheiro vai se mover", e essa não tem resposta numa conta fechada. */
export function opcoesDeConta(catalogo: CatalogoFinanceiro | undefined): OpcaoDeSelect[] {
  return (catalogo?.contas ?? [])
    .filter((c) => c.ativa)
    .map((c) => ({ value: c.conta_id, label: c.nome }));
}

/** Os centros de custo, com a linha de "sem centro" na frente.
 *
 * ⚠️ O centro é OPCIONAL e a maioria dos escritórios não usa nenhum -- a
 * primeira opção precisa dizer isso, senão o campo parece obrigatório por
 * não ter saída. */
export function opcoesDeCentro(catalogo: CatalogoFinanceiro | undefined): OpcaoDeSelect[] {
  return [
    { value: "", label: "Sem centro de custo" },
    ...(catalogo?.centros_de_custo ?? [])
      .filter((c) => c.ativo)
      .map((c) => ({ value: c.centro_id, label: c.nome })),
  ];
}

/** As pessoas que podem responder por um lançamento, com quem está logado
 * sempre presente.
 *
 * 🔴 **A lista vem do DEPARTAMENTO, e não do grupo** -- quem chama passa os
 * membros do subgrupo. `GET /grupos/membros` tem piso `manager`, e quem tem o
 * papel `financeiro` pode não ser: o campo responderia 403 e ficaria vazio
 * para exatamente quem usa a tela todo dia.
 *
 * ⚠️ **Quem está logado entra mesmo fora da lista.** Ele é o padrão do campo,
 * e um select cujo valor não está entre as opções desenha vazio -- pareceria
 * que ninguém responde pelo lançamento.
 */
export function opcoesDePessoa(membros: Membro[], eu: string): OpcaoDeSelect[] {
  return [
    ...membros.map((m) => ({ value: m.email, label: m.apelido || m.email })),
    ...(eu && !membros.some((m) => m.email === eu) ? [{ value: eu, label: eu }] : []),
  ];
}

/** A conta que a linha do lançamento mostra.
 *
 * 🔴 **A transferência tem DUAS**, e `conta_id` vazio: o dinheiro sai de uma
 * e entra na outra. Sem este caso a coluna aparecia em branco justamente na
 * linha em que a conta é a única coisa que importa -- visto na tela.
 *
 * ⚠️ A seta é `→` e não "para": a coluna é estreita e o nome das contas já é
 * longo ("Bradesco - honorários").
 *
 * ⚠️ Cai para vazio quando o catálogo ainda não chegou -- quem desenha
 * trunca, e um id cru na coluna seria pior que o branco de um instante.
 */
export function contaDoLancamento(
  lancamento: Lancamento,
  catalogo: CatalogoFinanceiro | undefined,
): string {
  const nome = (id: string) =>
    catalogo?.contas.find((c) => c.conta_id === id)?.nome ?? "";
  if (lancamento.conta_origem_id || lancamento.conta_destino_id) {
    return [nome(lancamento.conta_origem_id ?? ""), nome(lancamento.conta_destino_id ?? "")]
      .filter(Boolean)
      .join(" → ");
  }
  return nome(lancamento.conta_id);
}
