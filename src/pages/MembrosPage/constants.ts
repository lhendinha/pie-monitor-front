/** Cabeçalhos da tabela de Membros, na ordem do artifact. A última é a
 * coluna de ações -- sem nome, mas precisa existir pra a contagem de
 * colunas bater com a das linhas. */
/* ⚠️ "Nome completo", e não "Apelido": o modal que esta tabela abre já usa o
   rótulo novo, e a mesma coisa com dois nomes na mesma tela é o defeito que a
   troca do perfil existia para evitar. Atrás continua o campo `apelido`, sem
   migração -- o nome novo vale onde a PESSOA lê. */
export const COLUNAS_MEMBROS = ["Nome completo", "E-mail", "Papel", "Subgrupo"] as const;
export const COLUNA_DE_ACOES = "" as const;
