/** As três listas da aba, em pílulas.
 *
 * Categorias primeiro porque é a que mais se mexe: conta se cadastra uma vez,
 * centro de custo quase nunca.
 *
 * ⚠️ Pílula e não sub-aba: são recortes de UMA tela de configuração, não
 * telas diferentes. Sub-aba dentro de aba dá dois níveis de navegação na
 * mesma página.
 */
export const SECOES_DO_CATALOGO = [
  { id: "categorias", rotulo: "Categorias" },
  { id: "centros", rotulo: "Centros de custo" },
  { id: "contas", rotulo: "Contas" },
] as const;

/** O piso para MEXER no catálogo. Ler é `financeiro`+, escrever é `admin`+ --
 * a mesma régua de Fases e Situações, e o servidor a cobra de novo. */
export const PISO_PARA_ESCREVER = "admin";
