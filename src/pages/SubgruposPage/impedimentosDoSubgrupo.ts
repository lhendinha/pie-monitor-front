import { contar } from "../../utils";
import type { ConteudoDoSubgrupo } from "../../types";

/** As contagens viram a lista que o diálogo mostra -- só o que existe.
 * "0 processos" no meio da lista é ruído. */
export function impedimentosDoSubgrupo(conteudo?: ConteudoDoSubgrupo): string[] {
  if (!conteudo) return [];
  const linhas: [number, string, string][] = [
    [conteudo.membros, "membro", "membros"],
    [conteudo.processos, "processo", "processos"],
    [conteudo.tarefas, "tarefa", "tarefas"],
    [conteudo.atendimentos, "atendimento", "atendimentos"],
  ];
  return linhas
    .filter(([quantidade]) => quantidade > 0)
    .map(([quantidade, singular, plural]) => contar(quantidade, singular, plural));
}
