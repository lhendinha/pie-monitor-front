import ModalDeConfirmacao from "../ModalDeConfirmacao";
import { contar } from "../../utils";
import type { ConfirmacaoDeConclusaoEmLoteProps } from "./types";

/** A confirmação de CONCLUIR muitas tarefas de uma vez.
 *
 * 🔴 **Reversível, e o diálogo diz isso pela forma**: sem lixeira, botão
 * primário e sem "não pode ser desfeita" -- é o que o artefato validado
 * desenha. Ícone de lixo em ação reversível mente, e o aviso de irreversível
 * assusta à toa.
 *
 * ⚠️ A frase nomeia OS subgrupos: cada tarefa vai para a conclusão do quadro
 * DELA, e não para uma coluna escolhida aqui.
 *
 * ⚠️ A já concluída -- arquivada inclusive -- é contada ANTES de confirmar,
 * pelo `esta_concluida` que o servidor resolve, e volta ignorada na resposta.
 */
export default function ConfirmacaoDeConclusaoEmLote({
  tarefas,
  subgrupoNome,
  concluindo,
  onConfirmar,
  onFechar,
}: ConfirmacaoDeConclusaoEmLoteProps) {
  const quantas = contar(tarefas.length, "tarefa", "tarefas");
  const subgrupos = [...new Set(tarefas.map((t) => subgrupoNome(t.subgrupo_id)))];
  const jaFeitas = tarefas.filter((t) => t.esta_concluida).length;

  return (
    <ModalDeConfirmacao
      titulo={`Concluir ${quantas}`}
      mensagem={
        <>
          Cada uma vai para a coluna de conclusão do <strong>próprio</strong> subgrupo —{" "}
          {subgrupos.join(", ")} — e ganha a data de hoje.
        </>
      }
      aviso={
        jaFeitas > 0
          ? contar(jaFeitas, "já está concluída e será ignorada.", "já estão concluídas e serão ignoradas.")
          : undefined
      }
      nota="Dá para reabrir depois, arrastando de volta no quadro."
      reversivel
      varianteDoBotao="primario"
      /* ⚠️ "Concluir 3", e não "Concluir": o botão da barra se chama
         "Concluir", e dois controles com o mesmo nome acessível no mesmo
         documento fazem o leitor de tela anunciar a mesma escolha duas vezes. */
      rotulo={`Concluir ${tarefas.length}`}
      rotuloConfirmando="Concluindo…"
      confirmando={concluindo}
      onConfirmar={onConfirmar}
      onFechar={onFechar}
    />
  );
}
