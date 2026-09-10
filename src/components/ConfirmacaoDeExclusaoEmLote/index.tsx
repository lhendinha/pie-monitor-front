import ModalDeConfirmacao from "../ModalDeConfirmacao";
import { contar, contarVinculadas } from "../../utils";
import type { ConfirmacaoDeExclusaoEmLoteProps } from "./types";

/** A confirmação de uma exclusão em lote de tarefas.
 *
 * 🔴 Um componente só para as três telas. A primeira versão tinha o mesmo
 * JSX copiado na Área de trabalho e na Agenda -- e a frase da confirmação é
 * justamente a parte que muda com o tempo, então duas cópias divergiriam no
 * primeiro ajuste. Com o Kanban seriam três.
 *
 * ⚠️ **O rótulo do botão é DIFERENTE do gatilho na barra** ("Excluir 12"
 * lá, "Excluir 12 tarefas" aqui). Dois controles com o mesmo nome acessível
 * no mesmo documento fazem o leitor de tela anunciar a mesma escolha duas
 * vezes e quebram qualquer busca por nome -- é a regra que criou
 * `rotuloDeCancelar`, e foi um teste que a pegou.
 *
 * ⚠️ O número fica nos DOIS de propósito: é ele a guarda. O que separa é o
 * substantivo, que na confirmação lê melhor de qualquer forma.
 */
export default function ConfirmacaoDeExclusaoEmLote({
  tarefas,
  subgrupoNome,
  excluindo,
  onConfirmar,
  onFechar,
}: ConfirmacaoDeExclusaoEmLoteProps) {
  const quantas = contar(tarefas.length, "tarefa", "tarefas");
  const vinculadas = contarVinculadas(tarefas);
  const subgrupos = [...new Set(tarefas.map((t) => subgrupoNome(t.subgrupo_id)))];

  return (
    <ModalDeConfirmacao
      titulo={`Excluir ${quantas}`}
      mensagem={
        <>
          Você vai excluir <strong>{quantas}</strong>
          {" de "}
          {subgrupos.join(", ")}.
        </>
      }
      /* 🔴 "Sem responsável" NÃO é sinônimo de lixo.
         Medido em produção em 09/09/2026: três das quatro órfãs prendiam um
         processo VIVO. */
      aviso={
        vinculadas > 0
          ? `${contar(vinculadas, "delas está vinculada", "delas estão vinculadas")} a um processo ativo. O processo não muda — mas o que a tarefa pedia deixa de existir.`
          : undefined
      }
      rotulo={`Excluir ${quantas}`}
      confirmando={excluindo}
      onConfirmar={onConfirmar}
      onFechar={onFechar}
    />
  );
}
