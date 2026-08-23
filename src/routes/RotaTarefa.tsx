import { useParams } from "react-router-dom";

import { KanbanPage } from "../pages";

/** `/tarefas/:subgrupoId/:tarefaId` -- o endereço que o lembrete de prazo
 * manda por e-mail.
 *
 * Cai no Kanban porque é lá que a tarefa vive e que o modal dela já existe.
 * O artifact abriria isso na Agenda; enquanto ela não existe, o quadro do
 * subgrupo é o lugar certo -- e continua sendo um lugar honesto depois,
 * porque a tarefa está mesmo ali.
 *
 * Sem esta rota o link caía no `<Navigate to="/" replace />` e a pessoa era
 * jogada na Área de trabalho, sem a tarefa e sem explicação. O formato do
 * link nasceu correto em 21/08 justamente esperando por isto: e-mail
 * enviado não se corrige depois.
 */
export default function RotaTarefa() {
  const { subgrupoId = "", tarefaId = "" } = useParams();
  return <KanbanPage tarefaDoLink={{ subgrupoId, tarefaId }} />;
}
