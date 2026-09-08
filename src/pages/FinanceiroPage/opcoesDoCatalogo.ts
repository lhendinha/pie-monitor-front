import type { CatalogoFinanceiro, OpcaoDeSelect } from "../../types";

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
 * outra", e a tela não deve oferecer o que ele nega. */
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
