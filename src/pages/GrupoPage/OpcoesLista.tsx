import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
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
  listarOpcoesProcesso,
  criarOpcaoProcesso,
  atualizarOpcaoProcesso,
  desativarOpcaoProcesso,
  reativarOpcaoProcesso,
} from "../../services";
import { useToastOnQueryError, toastErroMutation } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import { Esqueleto, Modal, useToast } from "../../components";
import { TAMANHO_PAGINA_PICKER } from "../../constants";
import EditarOpcaoForm from "./EditarOpcaoForm";
import OpcaoRow from "./OpcaoRow";
import type { OpcaoProcesso, TipoOpcaoProcesso } from "../../types";

interface OpcoesListaProps {
  tipo: TipoOpcaoProcesso;
  titulo: string;
}

/** `ordem` do item movido = ponto médio entre os vizinhos na posição de
 * destino -- só esse 1 item precisa ser gravado (em vez de reindexar a
 * lista inteira, N-1 PATCHs). Nas pontas (sem vizinho de um dos lados),
 * usa o vizinho que existe ± 1. */
export function calcularOrdemAposMover(
  vizinhoAnterior: OpcaoProcesso | undefined,
  vizinhoSeguinte: OpcaoProcesso | undefined,
): number {
  if (vizinhoAnterior && vizinhoSeguinte) return (vizinhoAnterior.ordem + vizinhoSeguinte.ordem) / 2;
  if (vizinhoAnterior) return vizinhoAnterior.ordem + 1;
  if (vizinhoSeguinte) return vizinhoSeguinte.ordem - 1;
  return 1;
}

/** CRUD de 1 lista (fase OU situação) -- ao contrário do dropdown do
 * processo (que só mostra ativas), essa tela lista TODAS as opções,
 * incluindo inativas, com ação de reativar (soft-delete via `ativo`).
 *
 * A ordem é definida por drag and drop (não dá pra reordenar via drag
 * através de páginas), então a lista busca tudo de uma vez com
 * `TAMANHO_PAGINA_PICKER` em vez de paginar -- mesma premissa já usada
 * pelo dropdown de Fase/Situação em `CamposProcesso`. */
export default function OpcoesLista({ tipo, titulo }: OpcoesListaProps) {
  const [rotulo, setRotulo] = useState("");
  const [campoInvalido, setCampoInvalido] = useState(false);
  const [opcaoEmEdicao, setOpcaoEmEdicao] = useState<OpcaoProcesso | null>(null);
  const [ordemLocal, setOrdemLocal] = useState<OpcaoProcesso[] | null>(null);
  const toast = useToast();
  const queryClient = useQueryClient();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const query = useQuery<{ opcoes: OpcaoProcesso[]; total: number; total_paginas: number }>({
    queryKey: qk.opcoesProcesso(tipo, { tamanhoPagina: TAMANHO_PAGINA_PICKER }),
    queryFn: () => listarOpcoesProcesso(tipo, { tamanhoPagina: TAMANHO_PAGINA_PICKER }),
  });
  useToastOnQueryError(query.error, `Não foi possível carregar ${titulo.toLowerCase()}.`);
  const opcoesServidor = [...(query.data?.opcoes || [])].sort((a, b) => a.ordem - b.ordem);
  const opcoes = ordemLocal ?? opcoesServidor;
  const total = query.data?.total ?? 0;

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: qk.opcoesProcesso(tipo) });
  }

  const criarMutation = useMutation({
    // Maior `ordem` já em memória (não `total`, a contagem) -- desde que
    // `ordem` virou fracionário (Bloco H), um item já arrastado pro fim
    // pode ter `ordem` maior que a contagem de itens, então `total + 1`
    // podia nascer empatado ou atrás do que devia ser o último item.
    mutationFn: () => criarOpcaoProcesso(tipo, rotulo.trim(), Math.max(0, ...opcoes.map((o) => o.ordem)) + 1),
    onSuccess: () => {
      setRotulo("");
      invalidar();
    },
    onError: (err) => {
      setCampoInvalido(true);
      toastErroMutation(toast, err, "Não foi possível criar.");
    },
  });

  const desativarMutation = useMutation({
    mutationFn: (id: string) => desativarOpcaoProcesso(tipo, id),
    onSuccess: invalidar,
    onError: (err) => toastErroMutation(toast, err, "Não foi possível desativar."),
  });

  const reativarMutation = useMutation({
    mutationFn: (id: string) => reativarOpcaoProcesso(tipo, id),
    onSuccess: invalidar,
    onError: (err) => toastErroMutation(toast, err, "Não foi possível reativar."),
  });

  // 1 único PATCH por drag -- só o item movido precisa de uma `ordem` nova
  // (o ponto médio entre os vizinhos no destino), os demais nem são tocados.
  const reordenarMutation = useMutation({
    // Só `ordem` -- reenviar `opcao.rotulo` sobrescreveria uma edição de
    // rótulo concorrente com um valor possivelmente desatualizado (achado
    // na revisão de consistência).
    mutationFn: (opcao: OpcaoProcesso) => atualizarOpcaoProcesso(tipo, opcao.opcao_id, undefined, opcao.ordem),
    onSuccess: invalidar,
    onError: (err) => {
      setOrdemLocal(null);
      invalidar();
      toastErroMutation(toast, err, "Não foi possível reordenar.");
    },
  });

  // Sem o guard de `isPending`, um refetch em segundo plano (de outra
  // causa qualquer, não do PATCH desse próprio reorder) que atualize
  // `query.data` enquanto o PATCH ainda está em voo apagaria o "carimbo"
  // otimista de `ordemLocal` antes da confirmação -- a lista visualmente
  // voltaria à ordem antiga por um instante. `isPending` NÃO entra nas deps
  // de propósito: o efeito só precisa rodar de novo quando `query.data`
  // mudar de verdade (inclusive quando essa mudança é o refetch disparado
  // pelo próprio `onSuccess` do reorder, via `invalidar()`) -- nesse
  // momento a closure já lê o `isPending` mais recente. Colocar `isPending`
  // nas deps faria o efeito rodar de novo assim que ele virasse `false`
  // (que acontece antes do refetch confirmado chegar, já que `invalidar()`
  // não é aguardado dentro do `onSuccess`), apagando `ordemLocal` cedo
  // demais -- exatamente a race que esse guard existe pra evitar.
  useEffect(() => {
    if (reordenarMutation.isPending) return;
    setOrdemLocal(null);
  }, [query.data]);

  function handleCriar(e: FormEvent) {
    e.preventDefault();
    setCampoInvalido(false);
    criarMutation.mutate();
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    // Sem esse guard, um 2º drag iniciado antes do PATCH do 1º confirmar
    // reusaria a mesma `reordenarMutation` (1 só instância) -- se o 2º PATCH
    // assentasse antes do 1º, `isPending` viraria `false` com o 1º ainda em
    // voo, e um refetch concorrente nesse instante furaria o guard do efeito
    // acima (`ordemLocal` seria apagado antes da confirmação do 1º drag).
    if (!over || active.id === over.id || reordenarMutation.isPending) return;
    const oldIndex = opcoes.findIndex((o) => o.opcao_id === active.id);
    const newIndex = opcoes.findIndex((o) => o.opcao_id === over.id);
    const movido = arrayMove(opcoes, oldIndex, newIndex);
    const novaOrdem = calcularOrdemAposMover(movido[newIndex - 1], movido[newIndex + 1]);
    // "Carimba" o valor novo no item movido -- sem isso, editar o rótulo
    // dele logo em seguida (antes do refetch) reenviaria a `ordem` velha em
    // `EditarOpcaoForm` e desfaria o reorder que acabou de ser salvo.
    const opcaoMovida = { ...movido[newIndex], ordem: novaOrdem };
    setOrdemLocal(movido.map((o, i) => (i === newIndex ? opcaoMovida : o)));
    reordenarMutation.mutate(opcaoMovida);
  }

  return (
    <div>
      <form onSubmit={handleCriar}>
        <div className="form-row">
          <div className={`field${campoInvalido ? " field-error" : ""}`} style={{ flex: 2 }}>
            <label htmlFor={`novo-rotulo-${tipo}`}>Nova opção</label>
            <input
              id={`novo-rotulo-${tipo}`}
              value={rotulo}
              onChange={(e) => {
                setRotulo(e.target.value);
                setCampoInvalido(false);
              }}
            />
          </div>
          <button className="btn" type="submit" disabled={criarMutation.isPending || !rotulo.trim()}>
            {criarMutation.isPending ? "Criando…" : "Criar"}
          </button>
        </div>
      </form>

      <div className="section-head" style={{ marginTop: 16 }}>
        <h2>{titulo}</h2>
        <span className="section-count">{query.isPending ? "carregando…" : `${total}`}</span>
      </div>

      {query.isPending ? (
        <Esqueleto linhas={2} />
      ) : opcoes.length === 0 ? (
        <div className="empty">Nenhuma opção ainda.</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={opcoes.map((o) => o.opcao_id)} strategy={verticalListSortingStrategy}>
            <ul className="simple-list">
              {opcoes.map((o) => (
                <OpcaoRow
                  key={o.opcao_id}
                  opcao={o}
                  onEditar={() => setOpcaoEmEdicao(o)}
                  onDesativar={() => desativarMutation.mutate(o.opcao_id)}
                  onReativar={() => reativarMutation.mutate(o.opcao_id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {opcaoEmEdicao && (
        <Modal titulo="Editar opção" onFechar={() => setOpcaoEmEdicao(null)}>
          <EditarOpcaoForm
            tipo={tipo}
            opcao={opcaoEmEdicao}
            onAtualizado={invalidar}
            onFechar={() => setOpcaoEmEdicao(null)}
          />
        </Modal>
      )}
    </div>
  );
}
