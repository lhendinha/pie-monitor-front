export interface CampoDeResponsaveisProps {
  id?: string;
  /** De qual subgrupo vêm as opções. Vazio = ainda não escolhido (o
   * formulário de criação tem o seletor de subgrupo antes deste campo). */
  subgrupoId: string;
  /** E-mails escolhidos. */
  valor: string[];
  /** Apelido de cada e-mail escolhido, NA MESMA ORDEM -- é o
   * `responsaveis_nomes` que a resposta já traz.
   *
   * 🔴 Serve pra quem JÁ é responsável mas saiu do subgrupo: essa pessoa não
   * está na lista de membros, então sem isto a etiqueta cairia pro e-mail
   * cru. É o mesmo defeito que `responsavel_nome` tirou do modal de tarefa,
   * e o caso em que a pessoa mais precisa reconhecer de quem se trata. */
  nomes?: string[];
  onMudar: (emails: string[]) => void;
}
