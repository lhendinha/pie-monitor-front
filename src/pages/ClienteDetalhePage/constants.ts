/** As três abas da tela.
 *
 * A primeira é o padrão: é o cadastro, o que responde "quem é este
 * cliente".
 *
 * ⚠️ O nome do parâmetro na URL (`?aba=`) e o `abaValida` que o lê são
 * compartilhados -- ver `utils/abas`. Aqui fica só o que é desta tela.
 */
export const ABAS_DO_CLIENTE = [
  { id: "detalhes", rotulo: "Detalhes" },
  { id: "processos", rotulo: "Processos vinculados" },
  { id: "documentos", rotulo: "Documentos" },
] as const;

/** O prefixo dos ids de acessibilidade que ligam cada aba ao seu painel. */
export const GRUPO_DE_ABAS = "cliente";
