import { Stack, Textarea } from "@chakra-ui/react";
import { useId, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";

import {
  Botao,
  Campo,
  LinhaDeCampos,
  Modal,
  RodapeDeAcoes,
  Select,
  SeletorData,
  useToast,
} from "../../../../components";
import { criarTarefa, atualizarTarefa, removerTarefa } from "../../../../services";
import { toastErroMutation } from "../../../../services/queryClient";
import { hojeISO } from "../../../../utils";
import { PRIORIDADES } from "../../constants/kanban";
import type { ColunaDoQuadro, Membro, Subgrupo, Tarefa } from "../../../../types";

interface Props {
  /** Ausente = criando. */
  tarefa?: Tarefa | null;
  subgrupoAtual: string;
  subgrupos: Subgrupo[];
  colunas: ColunaDoQuadro[];
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
  const toast = useToast();

  const salvarMutation = useMutation({
    mutationFn: () =>
      editando && tarefa
        ? atualizarTarefa(tarefa.subgrupo_id, tarefa.tarefa_id, {
            titulo: titulo.trim(),
            data,
            coluna_id: colunaId,
            prioridade,
            responsavel_id: responsavel || null,
          })
        : criarTarefa({
            subgrupo_id: subgrupoId,
            titulo: titulo.trim(),
            data,
            coluna_id: colunaId,
            prioridade,
            responsavel_id: responsavel || null,
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
              onClick={() => removerMutation.mutate()}
            >
              Excluir
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

          <Campo rotulo="Coluna do quadro" para="tf-coluna" obrigatorio>
            <Select
              id="tf-coluna"
              opcoes={colunas.map((c) => ({ value: c.coluna_id, label: c.nome }))}
              valor={colunaId}
              onMudar={setColunaId}
            />
          </Campo>
        </Stack>
      </form>
    </Modal>
  );
}
