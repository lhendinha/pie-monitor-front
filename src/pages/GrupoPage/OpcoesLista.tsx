import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  listarOpcoesProcesso,
  criarOpcaoProcesso,
  atualizarOpcaoProcesso,
  desativarOpcaoProcesso,
  reativarOpcaoProcesso,
} from "../../services";
import { useToastOnQueryError, toastErroMutation } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import { Skeleton, Modal, useToast } from "../../components";
import { TAMANHO_PAGINA_PICKER } from "../../constants";
import EditarOpcaoForm from "./EditarOpcaoForm";
import OpcaoRow from "./OpcaoRow";
import type { OpcaoProcesso, TipoOpcaoProcesso } from "../../types";

interface OpcoesListaProps {
  tipo: TipoOpcaoProcesso;
  titulo: string;
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
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const query = useQuery<{ opcoes: OpcaoProcesso[]; total: number; total_paginas: number }>({
    queryKey: qk.opcoesProcesso(tipo, { tamanhoPagina: TAMANHO_PAGINA_PICKER }),
    queryFn: () => listarOpcoesProcesso(tipo, { tamanhoPagina: TAMANHO_PAGINA_PICKER }),
  });
  useToastOnQueryError(query.error, `Não foi possível carregar ${titulo.toLowerCase()}.`);
  const opcoesServidor = [...(query.data?.opcoes || [])].sort((a, b) => a.ordem - b.ordem);
  const opcoes = ordemLocal ?? opcoesServidor;
  const total = query.data?.total ?? 0;

  useEffect(() => {
    setOrdemLocal(null);
  }, [query.data]);

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: qk.opcoesProcesso(tipo) });
  }

  const criarMutation = useMutation({
    // `total` (contagem real, vinda do envelope de paginação), não
    // `opcoes.length` -- esse é só o tamanho da página atual, usar ele
    // aqui daria uma `ordem` errada a partir da 2ª página em diante.
    mutationFn: () => criarOpcaoProcesso(tipo, rotulo.trim(), total + 1),
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

  const reordenarMutation = useMutation({
    mutationFn: (novaOrdem: OpcaoProcesso[]) => {
      const alterados = novaOrdem
        .map((opcao, i) => ({ opcao, novaOrdemValor: i + 1 }))
        .filter(({ opcao, novaOrdemValor }) => opcao.ordem !== novaOrdemValor);
      return Promise.all(
        alterados.map(({ opcao, novaOrdemValor }) =>
          atualizarOpcaoProcesso(tipo, opcao.opcao_id, opcao.rotulo, novaOrdemValor),
        ),
      );
    },
    onSuccess: invalidar,
    onError: (err) => {
      // Com `Promise.all`, um PATCH que falha rejeita o lote inteiro mesmo
      // que outros já tenham sido persistidos -- `invalidar()` (em vez de só
      // `setOrdemLocal(null)`) busca o estado real do servidor de novo, pra
      // não deixar a lista visível divergindo do que já foi salvo.
      setOrdemLocal(null);
      invalidar();
      toastErroMutation(toast, err, "Não foi possível reordenar.");
    },
  });

  function handleCriar(e: FormEvent) {
    e.preventDefault();
    setCampoInvalido(false);
    criarMutation.mutate();
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = opcoes.findIndex((o) => o.opcao_id === active.id);
    const newIndex = opcoes.findIndex((o) => o.opcao_id === over.id);
    // `arrayMove` só reordena o array -- os objetos continuam com o `.ordem`
    // antigo. Sem "carimbar" o valor novo aqui, editar o rótulo de um item
    // logo após arrastá-lo (antes do refetch) reenviaria a `ordem` velha em
    // `EditarOpcaoForm` e desfaria o reorder que acabou de ser salvo.
    const movido = arrayMove(opcoes, oldIndex, newIndex);
    setOrdemLocal(movido.map((o, i) => ({ ...o, ordem: i + 1 })));
    reordenarMutation.mutate(movido);
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
        <Skeleton linhas={2} />
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
