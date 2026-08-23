import { Flex } from "@chakra-ui/react";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import {
  Botao,
  CabecalhoDePagina,
  EstadoVazio,
  Esqueleto,
  IconePlus,
  useToast,
} from "../../components";
import { TETO_POR_PAGINA } from "../../constants";
import {
  atualizarTarefa,
  listarMembrosDoGrupo,
  listarQuadro,
  listarSubgrupos,
  papelAtende,
} from "../../services";
import { toastErroMutation, useToastOnQueryError } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import ColunaDoQuadro from "./components/ColunaDoQuadro";
import FiltrosDoKanban from "./components/FiltrosDoKanban";
import ModalDeTarefa from "./components/ModalDeTarefa";
import { PERIODOS } from "./constants/kanban";
import { janelaDoPeriodo } from "./helpers/janelaDoPeriodo";
import { useTarefasDoQuadro } from "./hooks/useTarefasDoQuadro";
import type { FiltrosDoQuadro } from "./types";
import type {
  ColunaDoQuadro as Coluna,
  Membro,
  Subgrupo,
  Tarefa,
} from "../../types";

const FILTROS_VAZIOS = { periodoId: "mes", pessoa: "todas", busca: "" };

/** Gestão kanban.
 *
 * Cada subgrupo tem o PRÓPRIO quadro -- trocar o subgrupo não filtra, troca
 * de quadro. Por isso o seletor dele fica sempre ativo e fora do "Limpar
 * filtros".
 */
export default function KanbanPage() {
  const [filtros, setFiltros] = useState<FiltrosDoQuadro>({ subgrupoId: "", ...FILTROS_VAZIOS });
  const [tarefaAberta, setTarefaAberta] = useState<Tarefa | null>(null);
  const [criandoNaColuna, setCriandoNaColuna] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const subgruposQuery = useQuery<{ subgrupos: Subgrupo[] }>({
    queryKey: qk.subgrupos({ tamanhoPagina: TETO_POR_PAGINA }),
    queryFn: () => listarSubgrupos({ tamanhoPagina: TETO_POR_PAGINA }),
  });
  useToastOnQueryError(subgruposQuery.error, "Não foi possível carregar os subgrupos.");
  const subgrupos = subgruposQuery.data?.subgrupos || [];

  // O primeiro subgrupo abre por padrão -- sem isso a tela ficaria em branco
  // esperando uma escolha que quase sempre é a mesma.
  const subgrupoId = filtros.subgrupoId || subgrupos[0]?.subgrupo_id || "";

  const quadroQuery = useQuery<{ colunas: Coluna[] }>({
    queryKey: qk.quadro(subgrupoId),
    queryFn: () => listarQuadro(subgrupoId),
    enabled: Boolean(subgrupoId),
  });
  useToastOnQueryError(quadroQuery.error, "Não foi possível carregar o quadro.");

  const periodo = PERIODOS.find((p) => p.id === filtros.periodoId) ?? PERIODOS[0];
  const tarefasQuery = useTarefasDoQuadro(subgrupoId, janelaDoPeriodo(periodo.dias));
  useToastOnQueryError(tarefasQuery.error, "Não foi possível carregar as tarefas.");

  /** Nomes de quem é responsável. `manager` pra cima -- pra `user` a lista
   * não vem, e o cartão mostra o e-mail, que ainda identifica. */
  const membrosQuery = useQuery<{ membros: Membro[] }>({
    queryKey: qk.membros(),
    queryFn: listarMembrosDoGrupo,
    enabled: papelAtende("manager"),
  });
  const membros = membrosQuery.data?.membros || [];
  const apelidoPorEmail = new Map(membros.map((m) => [m.email, m.apelido || m.email]));

  const sensors = useSensors(
    /* 4px antes de virar arraste: sem isso, o clique que abre o cartão
       seria engolido pelo início de um arraste de zero pixel. */
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: ["tarefas"] });
    queryClient.invalidateQueries({ queryKey: qk.resumo() });
  }

  /** Arrastar cartão entre colunas = um PATCH só com `coluna_id`.
   *
   * ⚠️ O alvo da solta pode ser uma COLUNA ou um CARTÃO -- os cartões são
   * `useSortable`, e todo sortable também é área de solta. Sem resolver
   * isso, largar em cima de outro cartão mandava o id do CARTÃO como
   * `coluna_id` (visto na verificação: `coluna_id: "sg-civel:t5"`), e o
   * servidor recusaria com 400 dizendo que a coluna não é do quadro.
   *
   * O servidor recusa coluna de outro quadro de propósito; aqui isso nem
   * chega a acontecer, porque as colunas oferecidas são as do quadro
   * aberto. A validação existe dos dois lados. */
  function handleDragEnd(evento: DragEndEvent) {
    const tarefa = evento.active.data.current?.tarefa as Tarefa | undefined;
    const over = evento.over;
    if (!tarefa || !over) return;
    const tarefaAlvo = over.data.current?.tarefa as Tarefa | undefined;
    const destino = tarefaAlvo ? tarefaAlvo.coluna_id : String(over.id);
    if (!destino || tarefa.coluna_id === destino) return;
    atualizarTarefa(tarefa.subgrupo_id, tarefa.tarefa_id, { coluna_id: destino })
      .then(invalidar)
      .catch((err) => {
        invalidar();
        toastErroMutation(toast, err, "Não foi possível mover a tarefa.");
      });
  }

  const colunas = [...(quadroQuery.data?.colunas || [])].sort((a, b) => a.ordem - b.ordem);
  const busca = filtros.busca.trim().toLowerCase();

  const visiveis = (tarefasQuery.data || []).filter((t) => {
    const bateBusca =
      !busca ||
      t.titulo.toLowerCase().includes(busca) ||
      (t.processo_numero || "").includes(busca.replace(/\D/g, ""));
    const batePessoa =
      filtros.pessoa === "todas" ||
      (filtros.pessoa === "sem" ? !t.responsavel_id : t.responsavel_id === filtros.pessoa);
    return bateBusca && batePessoa;
  });

  const temFiltro = Boolean(busca) || filtros.pessoa !== "todas" || filtros.periodoId !== "todos";

  function limpar() {
    setFiltros((f) => ({ ...f, ...FILTROS_VAZIOS, periodoId: "todos" }));
  }

  const carregando = subgruposQuery.isPending || quadroQuery.isPending || tarefasQuery.isPending;

  return (
    <>
      <CabecalhoDePagina
        titulo="Gestão kanban"
        subtitulo="Cada subgrupo tem seu próprio quadro. Arraste os cartões entre colunas ou abra pra editar."
        acoes={
          subgrupos.length > 0 && (
            <Botao onClick={() => setCriandoNaColuna(colunas[0]?.coluna_id ?? "")}>
              <IconePlus />
              Nova tarefa
            </Botao>
          )
        }
      />

      {/* Grupo recém-criado não tem subgrupo nenhum -- é o PRIMEIRO estado
          que um cliente novo vê, não um caso raro. */}
      {!subgruposQuery.isPending && subgrupos.length === 0 ? (
        <EstadoVazio
          mensagem="Nenhum subgrupo ainda. O quadro é por subgrupo, então crie um primeiro."
          acao={
            papelAtende("manager") ? (
              <Botao variante="ghost" onClick={() => window.location.assign("/grupo")}>
                Ir para Grupo
              </Botao>
            ) : undefined
          }
        />
      ) : (
        <>
          <FiltrosDoKanban
            subgrupos={subgrupos}
            membros={membros}
            filtros={{ ...filtros, subgrupoId }}
            temFiltro={temFiltro}
            onMudar={(parcial) => setFiltros((f) => ({ ...f, subgrupoId, ...parcial }))}
            onLimpar={limpar}
          />

          {carregando ? (
            <Esqueleto linhas={4} />
          ) : temFiltro && visiveis.length === 0 ? (
            /* Quadro vazio POR FILTRO não é o mesmo que quadro vazio: sem
               dizer isso, a pessoa vê as colunas zeradas e acha que perdeu
               as tarefas. E como a janela de datas é o filtro que mais
               esconde, o caminho de saída fica junto. */
            <EstadoVazio
              mensagem="Nenhuma tarefa com os filtros atuais."
              acao={
                <Botao variante="ghost" onClick={limpar}>
                  Limpar filtros
                </Botao>
              }
            />
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
              <Flex gap="16px" align="flex-start" overflowX="auto" pb="8px">
                {colunas.map((c) => (
                  <ColunaDoQuadro
                    key={c.coluna_id}
                    coluna={c}
                    tarefas={visiveis.filter((t) => t.coluna_id === c.coluna_id)}
                    apelidoPorEmail={(email) => (email ? apelidoPorEmail.get(email) || email : undefined)}
                    onAbrirTarefa={setTarefaAberta}
                    onNovaTarefa={setCriandoNaColuna}
                  />
                ))}
              </Flex>
            </DndContext>
          )}
        </>
      )}

      {(tarefaAberta || criandoNaColuna !== null) && (
        <ModalDeTarefa
          tarefa={tarefaAberta}
          subgrupoAtual={subgrupoId}
          subgrupos={subgrupos}
          colunas={colunas}
          membros={membros}
          colunaInicial={criandoNaColuna ?? undefined}
          onSalvo={invalidar}
          onFechar={() => {
            setTarefaAberta(null);
            setCriandoNaColuna(null);
          }}
        />
      )}
    </>
  );
}
