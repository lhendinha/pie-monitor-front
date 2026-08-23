import { Stack, Textarea } from "@chakra-ui/react";
import { useId, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";

import {
  Botao,
  Campo,
  LinhaDeCampos,
  Modal,
  ModalDeConfirmacao,
  RodapeDeAcoes,
  Select,
  SeletorData,
  useToast,
} from "../../../../components";
import { criarTarefa, atualizarTarefa, removerTarefa } from "../../../../services";
import { toastErroMutation } from "../../../../services/queryClient";
import { hojeISO, mascararNumeroProcesso } from "../../../../utils";
import { PRIORIDADES } from "../../constants/kanban";
import VinculoDaTarefa from "./VinculoDaTarefa";
import type { VinculosDaTarefa } from "../../types";
import type { ColunaDoQuadro, Membro, Subgrupo, Tarefa } from "../../../../types";

interface Props {
  /** Ausente = criando. */
  tarefa?: Tarefa | null;
  subgrupoAtual: string;
  subgrupos: Subgrupo[];
  colunas: ColunaDoQuadro[];
  /** O quadro do subgrupo ainda está vindo. O botão "Nova tarefa" aparece
   * assim que os SUBGRUPOS resolvem, então dá pra abrir este modal com as
   * colunas a caminho -- e aí o seletor vinha vazio e o Salvar travado, sem
   * dizer por quê. */
  carregandoColunas?: boolean;
  membros: Membro[];
  /** Coluna pré-escolhida, quando veio do "+ Nova atividade" de uma coluna. */
  colunaInicial?: string;
  onSalvo: () => void;
  onFechar: () => void;
}

/** Criar e editar tarefa.
 *
 * ⚠️ Duas divergências do artifact, as duas por limite real da API:
 *
 * 1. **"Lista de tarefas" não existe aqui.** No artifact é um `select`
 *    obrigatório com UMA opção, já selecionada, que ninguém consegue mudar
 *    -- e não existe no backend: nenhuma rota aceita esse campo. É resquício
 *    de uma ideia que virou o próprio quadro. Um obrigatório de uma opção só
 *    é ruído puro, com um asterisco que promete uma decisão inexistente.
 *
 * 2. **Subgrupo só se escolhe ao CRIAR.** `subgrupo_id` faz parte da chave
 *    primária (`{subgrupo_id, tarefa_id}`) e o `PATCH` não o aceita -- nem
 *    poderia, DynamoDB não altera chave. Mover entre subgrupos seria apagar
 *    e recriar, o que gera um `tarefa_id` novo e mata os links de lembrete
 *    já enviados por e-mail. Editando, o campo fica desabilitado mostrando
 *    a qual subgrupo a tarefa pertence: sumir com ele deixaria a pessoa sem
 *    saber onde a tarefa vive, e deixá-lo editável seria prometer o que
 *    falha ao salvar.
 */
export default function ModalDeTarefa({
  tarefa,
  subgrupoAtual,
  subgrupos,
  colunas,
  carregandoColunas,
  membros,
  colunaInicial,
  onSalvo,
  onFechar,
}: Props) {
  const idFormulario = useId();
  const editando = Boolean(tarefa);

  const [titulo, setTitulo] = useState(tarefa?.titulo ?? "");
  const [data, setData] = useState(tarefa?.data ?? hojeISO());
  const [subgrupoId, setSubgrupoId] = useState(tarefa?.subgrupo_id ?? subgrupoAtual);
  const [colunaId, setColunaId] = useState(
    tarefa?.coluna_id ?? colunaInicial ?? colunas[0]?.coluna_id ?? "",
  );
  const [prioridade, setPrioridade] = useState(tarefa?.prioridade ?? "Média");
  const [responsavel, setResponsavel] = useState(tarefa?.responsavel_id ?? "");
  /** O rótulo inicial é o próprio número/id: o nome bonito (apelido do
   * processo, assunto do atendimento) exigiria buscar o item só pra abrir o
   * modal, e mostrar campo vazio numa tarefa QUE TEM vínculo seria pior --
   * salvar por cima apagaria o vínculo sem a pessoa perceber. */
  const [vinculos, setVinculos] = useState<VinculosDaTarefa>({
    processo: tarefa?.processo_numero
      ? {
          tipo: "processo",
          id: tarefa.processo_numero,
          rotulo: mascararNumeroProcesso(tarefa.processo_numero),
        }
      : null,
    atendimento: tarefa?.atendimento_id
      ? { tipo: "atendimento", id: tarefa.atendimento_id, rotulo: tarefa.atendimento_id }
      : null,
  });
  const [confirmandoRemocao, setConfirmandoRemocao] = useState(false);
  const toast = useToast();

  /** Os dois campos do vínculo, do jeito que a API espera: um preenchido e
   * o outro `null`. `null` explícito, e não omitido, porque é assim que se
   * DESFAZ um vínculo num PATCH parcial. */
  const camposDoVinculo = {
    processo_numero: vinculos.processo?.id ?? null,
    atendimento_id: vinculos.atendimento?.id ?? null,
  };

  const salvarMutation = useMutation({
    mutationFn: () =>
      editando && tarefa
        ? atualizarTarefa(tarefa.subgrupo_id, tarefa.tarefa_id, {
            titulo: titulo.trim(),
            data,
            coluna_id: colunaId,
            prioridade,
            responsavel_id: responsavel || null,
            ...camposDoVinculo,
          })
        : criarTarefa({
            subgrupo_id: subgrupoId,
            titulo: titulo.trim(),
            data,
            coluna_id: colunaId,
            prioridade,
            responsavel_id: responsavel || null,
            ...camposDoVinculo,
          }),
    onSuccess: () => {
      toast.sucesso(editando ? "Tarefa atualizada." : "Tarefa criada.");
      onSalvo();
      onFechar();
    },
    onError: (err) => toastErroMutation(toast, err, "Não foi possível salvar a tarefa."),
  });

  const removerMutation = useMutation({
    mutationFn: () => removerTarefa(tarefa!.subgrupo_id, tarefa!.tarefa_id),
    onSuccess: () => {
      toast.sucesso("Tarefa excluída.");
      onSalvo();
      onFechar();
    },
    onError: (err) => toastErroMutation(toast, err, "Não foi possível excluir."),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    salvarMutation.mutate();
  }

  return (
    <>
      <Modal
      titulo={editando ? "Editar tarefa" : "Nova tarefa"}
      onFechar={onFechar}
      rodape={
        <RodapeDeAcoes>
          {editando && (
            <Botao
              variante="perigoContorno"
              mr="auto"
              disabled={removerMutation.isPending}
              /* Passa pelo diálogo como TODA exclusão do sistema. Era a
                 única que não passava: um clique só, sem volta, e cujo
                 único retorno era o botão ficar desabilitado com o mesmo
                 rótulo -- parecia não ter feito nada. */
              onClick={() => setConfirmandoRemocao(true)}
            >
              {removerMutation.isPending ? "Excluindo…" : "Excluir"}
            </Botao>
          )}
          <Botao variante="ghost" onClick={onFechar}>
            Cancelar
          </Botao>
          <Botao
            type="submit"
            form={idFormulario}
            disabled={salvarMutation.isPending || !titulo.trim() || !colunaId}
          >
            {salvarMutation.isPending ? "Salvando…" : "Salvar"}
          </Botao>
        </RodapeDeAcoes>
      }
    >
      <form id={idFormulario} onSubmit={handleSubmit}>
        <Stack gap="0">
          <Campo rotulo="Descrição da tarefa" para="tf-titulo" obrigatorio>
            <Textarea
              id="tf-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={512}
              autoFocus
            />
          </Campo>

          <LinhaDeCampos>
            <Campo rotulo="Data" para="tf-data" obrigatorio>
              <SeletorData
                id="tf-data"
                rotuladoPor="tf-data-rotulo"
                valor={data}
                onMudar={setData}
              />
            </Campo>
            <Campo rotulo="Prioridade" para="tf-prioridade" obrigatorio>
              <Select
                id="tf-prioridade"
                opcoes={PRIORIDADES.map((p) => ({ value: p, label: p }))}
                valor={prioridade}
                onMudar={setPrioridade}
              />
            </Campo>
          </LinhaDeCampos>

          {/* Posição do artifact: depois da linha de Data, antes de
              Responsável. Não é obrigatório -- tarefa solta, sem processo
              nem atendimento, é caso comum.

              ⚠️ O campo é UM, então na prática escolhe-se um vínculo só.
              Isso é a forma do campo (é assim no artifact), NÃO uma regra
              do sistema: a API aceita `processo_numero` e `atendimento_id`
              ao mesmo tempo e grava os dois -- verificado. A dica não pode
              anunciar uma restrição que o servidor não tem. */}
          <Campo
            rotulo="Processo ou atendimento vinculado"
            para="tf-vinculo"
            dica="Opcional. Dá pra vincular um processo, um atendimento, ou os dois."
          >
            <VinculoDaTarefa valor={vinculos} onMudar={setVinculos} />
          </Campo>

          <LinhaDeCampos>
            <Campo rotulo="Responsável" para="tf-responsavel">
              <Select
                id="tf-responsavel"
                opcoes={[
                  { value: "", label: "Sem responsável" },
                  ...membros.map((m) => ({ value: m.email, label: m.apelido || m.email })),
                ]}
                valor={responsavel}
                onMudar={setResponsavel}
              />
            </Campo>
            <Campo
              rotulo="Subgrupo"
              para="tf-subgrupo"
              obrigatorio
              dica={editando ? "O subgrupo de uma tarefa não muda." : undefined}
            >
              <Select
                id="tf-subgrupo"
                opcoes={subgrupos.map((s) => ({ value: s.subgrupo_id, label: s.nome }))}
                valor={subgrupoId}
                onMudar={setSubgrupoId}
                desabilitado={editando}
              />
            </Campo>
          </LinhaDeCampos>

          <Campo
            rotulo="Coluna do quadro"
            para="tf-coluna"
            obrigatorio
          >
            <Select
              id="tf-coluna"
              opcoes={colunas.map((c) => ({ value: c.coluna_id, label: c.nome }))}
              valor={colunaId}
              onMudar={setColunaId}
              carregando={carregandoColunas}
            />
          </Campo>
        </Stack>
      </form>
      </Modal>

      {/* IRMÃO do modal, não filho: o corpo do `Modal` tem `overflow-y`, e
          uma sobreposição `position: fixed` lá dentro fica à mercê de
          qualquer ancestral com `transform`. Fora, é uma camada limpa por
          cima da outra. */}
      {confirmandoRemocao && tarefa && (
        <ModalDeConfirmacao
          titulo="Excluir tarefa"
          mensagem={
            <>
              A tarefa <strong>{tarefa.titulo}</strong> será removida do quadro.
            </>
          }
          confirmando={removerMutation.isPending}
          onConfirmar={() => removerMutation.mutate()}
          onFechar={() => setConfirmandoRemocao(false)}
        />
      )}
    </>
  );
}
