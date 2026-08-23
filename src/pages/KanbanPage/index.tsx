import { Flex } from "@chakra-ui/react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  EstadoDeErro,
  Esqueleto,
  IconePlus,
  useToast,
} from "../../components";
import { PERIODO_TODOS, TETO_POR_PAGINA } from "../../constants";
import {
  atualizarTarefa,
  listarMembrosDoGrupo,
  listarQuadro,
  listarSubgrupos,
  papelAtende,
} from "../../services";
import { toastErroMutation, useToastOnQueryError } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import { intervaloDoPeriodo } from "../../utils";
import ColunaDoQuadro from "./components/ColunaDoQuadro";
import { moverTarefaNaLista } from "./helpers/cacheDoQuadro";
import FiltrosDoKanban from "./components/FiltrosDoKanban";
import ModalDeTarefa from "./components/ModalDeTarefa";
import { useTarefasDoQuadro } from "./hooks/useTarefasDoQuadro";
import type { FiltrosDoQuadro } from "./types";
import type {
  ColunaDoQuadro as Coluna,
  Membro,
  Subgrupo,
  Tarefa,
} from "../../types";

/** O quadro ABRE no mês, como no artifact (`PERIODS = { kanban: 'mes' }`)
 * -- carregar o histórico inteiro por padrão seriam milhares de cartões,
 * já que tarefa concluída não some, só muda de coluna. */
const FILTROS_VAZIOS = {
  periodoId: "mes",
  intervaloPersonalizado: undefined,
  pessoa: "todas",
  busca: "",
};

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

  // Um subgrupo abre por padrão -- sem isso a tela ficaria em branco
  // esperando uma escolha que quase sempre é a mesma. É o ÚLTIMO da lista,
  // não o primeiro: a listagem vem na ordem de criação, então o último é o
  // mais recente, que é o que costuma estar em uso.
  const subgrupoId = filtros.subgrupoId || subgrupos[subgrupos.length - 1]?.subgrupo_id || "";

  const quadroQuery = useQuery<{ colunas: Coluna[] }>({
    queryKey: qk.quadro(subgrupoId),
    queryFn: () => listarQuadro(subgrupoId),
    enabled: Boolean(subgrupoId),
  });
  useToastOnQueryError(quadroQuery.error, "Não foi possível carregar o quadro.");

  // `intervalo` é `null` em "Todos os períodos", e aí a janela sai vazia --
  // o serviço omite `data_de`/`data_ate` da query e vem o subgrupo inteiro.
  const intervalo = intervaloDoPeriodo(filtros.periodoId, filtros.intervaloPersonalizado);
  const tarefasQuery = useTarefasDoQuadro(
    subgrupoId,
    intervalo ? { dataDe: intervalo.de, dataAte: intervalo.ate } : {},
  );
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
  /** ⚠️ Otimista, e não um PATCH solto. Sem isto o cartão VOLTAVA pra coluna
   * de origem no instante da solta e só pulava pra nova quando o refetch
   * chegasse -- um pisca-pisca que parece que o arraste falhou. Agora ele
   * fica onde foi largado, e volta sozinho se o servidor recusar. */
  const moverMutation = useMutation({
    mutationFn: ({ tarefa, destino }: { tarefa: Tarefa; destino: string }) =>
      atualizarTarefa(tarefa.subgrupo_id, tarefa.tarefa_id, { coluna_id: destino }),
    onMutate: async ({ tarefa, destino }) => {
      // Cancela o que estiver em voo: um refetch chegando depois do carimbo
      // otimista o sobrescreveria com a posição antiga.
      await queryClient.cancelQueries({ queryKey: ["tarefas"] });
      const anteriores = queryClient.getQueriesData<Tarefa[]>({ queryKey: ["tarefas"] });
      // Todas as listas em cache, não só a visível: o mesmo cartão aparece
      // em janelas de data diferentes, e deixar uma delas com a coluna
      // velha faz o cartão saltar ao trocar o filtro.
      queryClient.setQueriesData<Tarefa[]>({ queryKey: ["tarefas"] }, (lista) =>
        moverTarefaNaLista(lista, tarefa.tarefa_id, destino),
      );
      return { anteriores };
    },
    onError: (err, _variaveis, contexto) => {
      contexto?.anteriores.forEach(([chave, dados]) => queryClient.setQueryData(chave, dados));
      toastErroMutation(toast, err, "Não foi possível mover a tarefa.");
    },
    onSettled: invalidar,
  });

  function handleDragEnd(evento: DragEndEvent) {
    const tarefa = evento.active.data.current?.tarefa as Tarefa | undefined;
    const over = evento.over;
    if (!tarefa || !over) return;
    const tarefaAlvo = over.data.current?.tarefa as Tarefa | undefined;
    const destino = tarefaAlvo ? tarefaAlvo.coluna_id : String(over.id);
    if (!destino || tarefa.coluna_id === destino) return;
    moverMutation.mutate({ tarefa, destino });
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

  const temFiltro =
    Boolean(busca) || filtros.pessoa !== "todas" || filtros.periodoId !== PERIODO_TODOS;

  /** Limpar leva a período NENHUM, e não de volta ao mês padrão: quem
   * clica em "Limpar filtros" olhando um quadro vazio quer VER tudo, e
   * devolvê-lo ao mês deixaria escondido justamente o que ele procura. */
  function limpar() {
    setFiltros((f) => ({ ...f, ...FILTROS_VAZIOS, periodoId: PERIODO_TODOS }));
  }

  const carregando = subgruposQuery.isPending || quadroQuery.isPending || tarefasQuery.isPending;
  /* Sem isto, uma falha de rede pintava o quadro vazio com "Nenhuma tarefa
     com os filtros atuais" -- acusando o filtro por um erro que não é dele,
     e oferecendo "Limpar filtros", que não resolve nada. */
  const falhou = subgruposQuery.isError || quadroQuery.isError || tarefasQuery.isError;
  const tentandoDeNovo =
    subgruposQuery.isFetching || quadroQuery.isFetching || tarefasQuery.isFetching;

  function recarregarQuadro() {
    if (subgruposQuery.isError) subgruposQuery.refetch();
    if (quadroQuery.isError) quadroQuery.refetch();
    if (tarefasQuery.isError) tarefasQuery.refetch();
  }

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
            onMudar={(parcial) => setFiltros((f) => ({ ...f, subgrupoId, ...parcial }))}
          />

          {falhou ? (
            <EstadoDeErro
              mensagem="Não foi possível carregar o quadro."
              onTentarDeNovo={recarregarQuadro}
              tentando={tentandoDeNovo}
            />
          ) : carregando ? (
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
          carregandoColunas={quadroQuery.isPending}
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
