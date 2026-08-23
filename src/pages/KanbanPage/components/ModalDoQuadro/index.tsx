import { Box, Flex, Input, Stack, Text } from "@chakra-ui/react";
import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import {
  Botao,
  Campo,
  IconePlus,
  Modal,
  ModalDeConfirmacao,
  useToast,
} from "../../../../components";
import {
  atualizarColuna,
  criarColuna,
  marcarColunaConclusao,
  removerColuna,
} from "../../../../services";
import { toastErroMutation } from "../../../../services/queryClient";
import { qk } from "../../../../services/queryKeys";
import { calcularOrdemAposMover, contar } from "../../../../utils";
import { useTarefasDoQuadro } from "../../hooks/useTarefasDoQuadro";
import { posicaoValidaNoQuadro } from "../../helpers/posicaoDeColuna";
import LinhaDeColuna from "../LinhaDeColuna";
import type { ColunaDoQuadro } from "../../../../types";
import type { RenomearColuna } from "../../types";

interface ModalDoQuadroProps {
  subgrupoId: string;
  subgrupoNome: string;
  colunas: ColunaDoQuadro[];
  onFechar: () => void;
}

/** "Editar quadro" -- criar, renomear, reordenar, marcar conclusão e
 * remover coluna. Piso `admin` no servidor e no botão que abre isto.
 *
 * O quadro é configuração do escritório; a tarefa é trabalho do dia. Por
 * isso os pisos são diferentes, e por isso isto é um modal à parte em vez
 * de edição solta no próprio quadro.
 */
export default function ModalDoQuadro({
  subgrupoId,
  subgrupoNome,
  colunas,
  onFechar,
}: ModalDoQuadroProps) {
  const [nova, setNova] = useState("");
  const [renomeandoId, setRenomeandoId] = useState<string | null>(null);
  const [paraExcluir, setParaExcluir] = useState<ColunaDoQuadro | null>(null);
  const [ordemLocal, setOrdemLocal] = useState<ColunaDoQuadro[] | null>(null);
  const toast = useToast();
  const queryClient = useQueryClient();

  /** ⚠️ Conta as tarefas SEM janela de data, e não reaproveita as que o
   * quadro carregou.
   *
   * O quadro respeita o filtro de período; este aviso, não pode. Filtrado em
   * "Hoje", a lista traria 2 tarefas e o diálogo anunciaria "2 tarefas vão
   * para X" -- enquanto o servidor moveria as cinquenta que existem. Uma
   * frase falsa sobre uma ação destrutiva.
   *
   * O `{}` é a janela vazia: `useTarefasDoQuadro` então pagina o subgrupo
   * inteiro. Chave própria no cache, compartilhada com quem pedir a mesma
   * coisa. */
  const todasQuery = useTarefasDoQuadro(subgrupoId, {});
  const tarefas = todasQuery.data ?? [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const lista = ordemLocal ?? [...colunas].sort((a, b) => a.ordem - b.ordem);
  const comuns = lista.filter((c) => !c.e_conclusao && !c.e_arquivado);

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: qk.quadro(subgrupoId) });
    // Mover ou apagar coluna mexe em ONDE as tarefas estão -- o quadro atrás
    // do modal mostraria a distribuição velha.
    queryClient.invalidateQueries({ queryKey: ["tarefas"] });
  }

  const criarMutation = useMutation({
    mutationFn: (nome: string) => criarColuna(subgrupoId, nome),
    onSuccess: () => {
      setNova("");
      invalidar();
    },
    onError: (err) => toastErroMutation(toast, err, "Não foi possível criar a coluna."),
  });

  const renomearMutation = useMutation({
    // Só o nome: reenviar a `ordem` sobrescreveria um arraste concorrente
    // com um valor possivelmente defasado.
    mutationFn: ({ id, nome }: RenomearColuna) =>
      atualizarColuna(subgrupoId, id, { nome }),
    onSuccess: invalidar,
    onError: (err) => toastErroMutation(toast, err, "Não foi possível renomear a coluna."),
    onSettled: () => setRenomeandoId(null),
  });

  const conclusaoMutation = useMutation({
    mutationFn: (id: string) => marcarColunaConclusao(subgrupoId, id),
    onSuccess: () => {
      invalidar();
      // O resumo conta "concluídas", e o que é concluído acabou de mudar.
      queryClient.invalidateQueries({ queryKey: qk.resumo() });
      toast.sucesso("Coluna de conclusão definida.");
    },
    onError: (err) => toastErroMutation(toast, err, "Não foi possível marcar a coluna."),
  });

  const excluirMutation = useMutation({
    mutationFn: (id: string) => removerColuna(subgrupoId, id),
    onSuccess: () => {
      invalidar();
      toast.sucesso("Coluna excluída.");
    },
    onError: (err) => toastErroMutation(toast, err, "Não foi possível excluir a coluna."),
    onSettled: () => setParaExcluir(null),
  });

  /** Um PATCH por arrastada: só a coluna movida ganha `ordem` nova (o ponto
   * médio entre os vizinhos no destino). Mesma mecânica de Fases/Situações. */
  const reordenarMutation = useMutation({
    mutationFn: (coluna: ColunaDoQuadro) =>
      atualizarColuna(subgrupoId, coluna.coluna_id, { ordem: coluna.ordem }),
    onSuccess: invalidar,
    onError: (err) => {
      setOrdemLocal(null);
      invalidar();
      toastErroMutation(toast, err, "Não foi possível reordenar.");
    },
    onSettled: () => setOrdemLocal(null),
  });

  function handleDragEnd(evento: DragEndEvent) {
    const { active, over } = evento;
    if (!over || active.id === over.id || reordenarMutation.isPending) return;
    const de = lista.findIndex((c) => c.coluna_id === active.id);
    /* Trunca no último lugar antes da conclusão: o `dnd-kit` deixa soltar
       depois dela, e o servidor recusaria com 409. */
    const para = posicaoValidaNoQuadro(
      lista.findIndex((c) => c.coluna_id === over.id),
      lista,
    );
    if (para === de) return;
    const movida = arrayMove(lista, de, para);
    const ordem = calcularOrdemAposMover(movida[para - 1], movida[para + 1]);
    const colunaMovida = { ...movida[para], ordem };
    setOrdemLocal(movida.map((c, i) => (i === para ? colunaMovida : c)));
    reordenarMutation.mutate(colunaMovida);
  }

  function emAndamento(id: string) {
    return (
      (renomearMutation.isPending && renomearMutation.variables?.id === id) ||
      (conclusaoMutation.isPending && conclusaoMutation.variables === id) ||
      (excluirMutation.isPending && excluirMutation.variables === id) ||
      (reordenarMutation.isPending && reordenarMutation.variables?.coluna_id === id)
    );
  }

  const contarNaColuna = (id: string) => tarefas.filter((t) => t.coluna_id === id).length;

  function handleCriar(e: FormEvent) {
    e.preventDefault();
    const nome = nova.trim();
    if (nome) criarMutation.mutate(nome);
  }

  /** Pra onde vão as tarefas da coluna excluída: a ANTERIOR, ou a segunda
   * quando se apaga a primeira. É a regra do servidor, repetida aqui só
   * pra poder AVISAR antes -- quem decide continua sendo ele. */
  function destinoAoExcluir(coluna: ColunaDoQuadro) {
    const i = lista.findIndex((c) => c.coluna_id === coluna.coluna_id);
    return i > 0 ? lista[i - 1] : lista[1];
  }

  function avisoDaExclusao(coluna: ColunaDoQuadro) {
    const quantas = contarNaColuna(coluna.coluna_id);
    if (quantas === 0) return undefined;
    const destino = destinoAoExcluir(coluna);
    const frase = `${contar(quantas, "tarefa", "tarefas")} vão para "${
      destino?.nome ?? "a coluna anterior"
    }".`;
    /* ⚠️ O destino sendo a coluna de conclusão, essas tarefas passam a
       CONTAR COMO CONCLUÍDAS -- sem ninguém as ter feito. Dizer só "vão
       para X" esconderia a única parte que importa. */
    return destino?.e_conclusao
      ? `${frase} Como "${destino.nome}" é a coluna de conclusão, elas passam a contar como concluídas.`
      : frase;
  }

  return (
    <>
      <Modal titulo={`Editar quadro — ${subgrupoNome}`} onFechar={onFechar}>
        <Stack gap="0">
          <Text fontSize="11.5px" color="fg.subtle" mb="12px" lineHeight="1.5">
            Ao excluir uma coluna, as tarefas dela são movidas para a coluna anterior. A coluna
            marcada como <strong>conclusão</strong> é a que faz a tarefa contar como concluída;
            <strong> Arquivado</strong> guarda o que já foi concluído há tempo, e continua contando
            como concluído. As duas ficam sempre no fim, nessa ordem — por isso não se arrastam.
          </Text>

          {/* Antes da lista: criar coluna é a ação que se procura ao abrir isto,
              e embaixo de uma lista longa ela ficava fora da vista. */}
          <Box as="form" onSubmit={handleCriar} mb="18px">
            <Campo rotulo="Nova coluna" para="nova-coluna">
              <Flex gap="8px">
                <Input
                  id="nova-coluna"
                  flex="1"
                  value={nova}
                  onChange={(e) => setNova(e.target.value)}
                  placeholder="Nome da coluna"
                  maxLength={120}
                />
                <Botao type="submit" disabled={criarMutation.isPending || !nova.trim()}>
                  <IconePlus />
                  {criarMutation.isPending ? "Adicionando…" : "Adicionar"}
                </Botao>
              </Flex>
            </Campo>
          </Box>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={lista.map((c) => c.coluna_id)}
              strategy={verticalListSortingStrategy}
            >
              {lista.map((coluna) => (
                <LinhaDeColuna
                  key={coluna.coluna_id}
                  coluna={coluna}
                  tarefas={contarNaColuna(coluna.coluna_id)}
                  editando={renomeandoId === coluna.coluna_id}
                  emAndamento={emAndamento(coluna.coluna_id)}
                  /* O quadro precisa de pelo menos uma coluna ALÉM da de
                     conclusão -- o servidor recusa, e a lixeira nem
                     aparece. Só com a conclusão, toda tarefa nova nasceria
                     dentro dela, ou seja, já concluída. */
                  podeExcluir={comuns.length > 1}
                  onIniciarRenome={() => setRenomeandoId(coluna.coluna_id)}
                  onRenomear={(nome) =>
                    renomearMutation.mutate({ id: coluna.coluna_id, nome })
                  }
                  onCancelarRenome={() => setRenomeandoId(null)}
                  onMarcarConclusao={() => conclusaoMutation.mutate(coluna.coluna_id)}
                  onExcluir={() => setParaExcluir(coluna)}
                />
              ))}
            </SortableContext>
          </DndContext>        </Stack>
      </Modal>

      {/* Irmão do modal, não filho: o corpo do `Modal` tem `overflow-y`, e
          uma sobreposição fixa lá dentro fica à mercê de qualquer ancestral
          com `transform`. */}
      {paraExcluir && (
        <ModalDeConfirmacao
          titulo="Excluir coluna"
          mensagem={
            <>
              A coluna <strong>{paraExcluir.nome}</strong> do quadro de{" "}
              <strong>{subgrupoNome}</strong> será removida.
            </>
          }
          /* O medo aqui é perder tarefa, e não é isso que acontece: elas
             mudam de coluna. Dizer pra ONDE é o que desarma o medo -- e,
             quando o destino é a coluna de CONCLUSÃO, dizer o que isso
             significa, porque "concluída" é derivado de estar nela.
             Acontece de verdade: basta a conclusão estar posicionada antes
             da coluna que se exclui. */
          aviso={avisoDaExclusao(paraExcluir)}
          /* Sem a contagem real não dá pra prometer pra onde as tarefas
             vão -- e é justamente o que desarma o medo de perdê-las. */
          verificando={todasQuery.isPending}
          mensagemDeEspera="Conferindo quantas tarefas estão nessa coluna…"
          falhouAVerificacao={todasQuery.isError}
          confirmando={excluirMutation.isPending}
          onConfirmar={() => excluirMutation.mutate(paraExcluir.coluna_id)}
          onFechar={() => setParaExcluir(null)}
        />
      )}
    </>
  );
}
