import { Flex } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Query } from "@tanstack/react-query";
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
  ModalDeTarefa,
  useToast,
} from "../../components";
import { PERIODO_TODOS } from "../../constants";
import {
  atualizarTarefa,
  detalhesTarefa,
  listarTodosOsMembrosDoGrupo,
  listarQuadro,
  papelAtende,
} from "../../services";
import { toastErroMutation, useToastOnQueryError } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import { intervaloDoPeriodo } from "../../utils";
import ColunaDoQuadro from "./components/ColunaDoQuadro";
import { moverTarefaNaLista } from "./cacheDoQuadro";
import FiltrosDoKanban from "./components/FiltrosDoKanban";

import ModalDoQuadro from "./components/ModalDoQuadro";
import { useTarefasDoQuadro } from "./hooks/useTarefasDoQuadro";
import type { FiltrosDoQuadro } from "./types";
import type {
  RespostaDeMembros,
  RespostaDoQuadro,
} from "../../types/respostas";
import type { Tarefa } from "../../types";
import type { MoverTarefa, TarefaDoLink } from "./types";
import { useTodosOsSubgrupos } from "../../hooks/useCatalogos";

/** O quadro ABRE SEM JANELA DE DATA -- diverge do artifact, que abre no mês
 * (`PERIODS = { kanban: 'mes' }`).
 *
 * O mês só fazia sentido enquanto a janela limitava uma ponta só. Desde que
 * ela passou a limitar as DUAS (necessário pros períodos passados, como
 * "Ontem" e "Últimos 7 dias"), "Este mês" ESCONDE tarefa vencida do mês
 * anterior -- num quadro, exatamente o que mais precisa de atenção.
 *
 * O custo conhecido: tarefa concluída não some, só muda de coluna, então a
 * coluna de conclusão acumula com o tempo. Preferimos um quadro cheio a um
 * quadro que mente sobre o que está em aberto -- e a separação certa
 * (aberta × concluída, que a API sabe fazer com `apenas_abertas`) fica pra
 * quando o desenho da coluna de conclusão for decidido. */
/* ⚠️ `mostrarArquivadas` fica FORA daqui de propósito: "Limpar filtros" não
   pode esconder uma coluna que a pessoa acabou de revelar. É preferência de
   visualização, não filtro. */
const FILTROS_VAZIOS = {
  periodoId: PERIODO_TODOS,
  intervaloPersonalizado: undefined,
  pessoa: "todas",
  busca: "",
};

interface KanbanPageProps {
  /** A tarefa que o link do lembrete de prazo aponta
   * (`/tarefas/:subgrupoId/:tarefaId`).
   *
   * Abre o quadro DELA e o modal dela, já carregado. Sem isto o link caía
   * no `<Navigate to="/" />` e a pessoa era jogada na Área de trabalho, sem
   * a tarefa e sem explicação -- e esse endereço já sai por e-mail desde
   * 21/08, com o formato correto de propósito, esperando esta rota. */
  tarefaDoLink?: TarefaDoLink;
}

/** Gestão kanban.
 *
 * Cada subgrupo tem o PRÓPRIO quadro -- trocar o subgrupo não filtra, troca
 * de quadro. Por isso o seletor dele fica sempre ativo e fora do "Limpar
 * filtros".
 */
export default function KanbanPage({ tarefaDoLink }: KanbanPageProps = {}) {
  const [filtros, setFiltros] = useState<FiltrosDoQuadro>({
    /* O quadro abre no subgrupo da tarefa do link -- é o dela que interessa,
       não o último da lista. */
    subgrupoId: tarefaDoLink?.subgrupoId ?? "",
    mostrarArquivadas: false,
    ...FILTROS_VAZIOS,
  });
  const [tarefaAberta, setTarefaAberta] = useState<Tarefa | null>(null);
  /** O link já foi consumido -- fechar o modal não pode reabri-lo. */
  const [linkConsumido, setLinkConsumido] = useState(false);
  const [criandoNaColuna, setCriandoNaColuna] = useState<string | null>(null);
  const [editandoQuadro, setEditandoQuadro] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();

  const subgruposQuery = useTodosOsSubgrupos();
  useToastOnQueryError(subgruposQuery.error, "Não foi possível carregar os subgrupos.");
  const subgrupos = subgruposQuery.data || [];

  // Um subgrupo abre por padrão -- sem isso a tela ficaria em branco
  // esperando uma escolha que quase sempre é a mesma. É o ÚLTIMO da lista,
  // não o primeiro: a listagem vem na ordem de criação, então o último é o
  // mais recente, que é o que costuma estar em uso.
  const subgrupoId = filtros.subgrupoId || subgrupos[subgrupos.length - 1]?.subgrupo_id || "";

  const quadroQuery = useQuery<RespostaDoQuadro>({
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
  const membrosQuery = useQuery<RespostaDeMembros>({
    queryKey: qk.todosOsMembros(),
    queryFn: listarTodosOsMembrosDoGrupo,
    enabled: papelAtende("manager"),
  });
  const membros = membrosQuery.data?.membros || [];

  /** Carrega a tarefa do link direto pelo par que a identifica.
   *
   * ⚠️ NÃO dá pra esperar que ela apareça no quadro: o quadro abre filtrado
   * no mês, e um lembrete de prazo pode ser de uma tarefa fora dessa janela
   * -- justamente as atrasadas, que são as que mais geram lembrete. Buscar
   * a tarefa sozinha é o único caminho que sempre funciona. */
  const tarefaDoLinkQuery = useQuery<Tarefa>({
    queryKey: tarefaDoLink
      ? qk.tarefa(tarefaDoLink.subgrupoId, tarefaDoLink.tarefaId)
      : ["tarefa", "nenhuma"],
    queryFn: () => detalhesTarefa(tarefaDoLink!.subgrupoId, tarefaDoLink!.tarefaId) as Promise<Tarefa>,
    enabled: Boolean(tarefaDoLink) && !linkConsumido,
    /* Link velho aponta pra tarefa que pode ter sido excluída. Retentar um
       404 só atrasa o recado. */
    retry: false,
  });
  useToastOnQueryError(
    tarefaDoLinkQuery.error,
    "Não foi possível abrir a tarefa do link. Ela pode ter sido excluída.",
  );

  /** Abre o modal quando a tarefa do link chega -- uma vez só. */
  useEffect(() => {
    if (tarefaDoLinkQuery.data && !linkConsumido) {
      setTarefaAberta(tarefaDoLinkQuery.data);
      setLinkConsumido(true);
    }
  }, [tarefaDoLinkQuery.data, linkConsumido]);
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
    mutationFn: ({ tarefa, destino }: MoverTarefa) =>
      atualizarTarefa(tarefa.subgrupo_id, tarefa.tarefa_id, { coluna_id: destino }),
    onMutate: async ({ tarefa, destino }) => {
      // Cancela o que estiver em voo: um refetch chegando depois do carimbo
      // otimista o sobrescreveria com a posição antiga.
      await queryClient.cancelQueries({ queryKey: ["tarefas"] });
      // 🔴 Só as consultas que guardam LISTA.
      //
      // O prefixo `["tarefas"]` é compartilhado por caches de formatos
      // diferentes: `qk.tarefas(params)` da Área de trabalho guarda
      // `{tarefas, total, total_paginas}` e `qk.tarefasDoProcesso` guarda
      // outro objeto. Sem o predicado, o carimbo otimista chamava `.map`
      // neles, lançava dentro do `onMutate`, e o React Query nem chegava a
      // executar o `mutationFn` -- o cartão não mudava de coluna no servidor
      // e a pessoa via só "Não foi possível mover a tarefa".
      const soListas = { queryKey: ["tarefas"], predicate: (q: Query) => Array.isArray(q.state.data) };
      const anteriores = queryClient.getQueriesData<Tarefa[]>(soListas);
      // Todas as listas em cache, não só a visível: o mesmo cartão aparece
      // em janelas de data diferentes, e deixar uma delas com a coluna
      // velha faz o cartão saltar ao trocar o filtro.
      queryClient.setQueriesData<Tarefa[]>(soListas, (lista) =>
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
  /** O Arquivado só aparece no quadro quando pedido.
   *
   * Ele é o depósito do que já saiu do fluxo -- à vista o tempo todo, rouba
   * uma coluna de largura pro que ninguém está tocando. Quem edita o quadro
   * continua vendo a coluna na lista do modal, com ou sem o filtro: é onde
   * ela precisa aparecer pra a regra do quadro fazer sentido. */
  const colunasVisiveis = colunas.filter((c) => !c.e_arquivado || filtros.mostrarArquivadas);
  const busca = filtros.busca.trim().toLowerCase();

  const visiveis = (tarefasQuery.data || []).filter((t) => {
    // 🔴 `digitos` precisa ser conferido antes de usar: `"".includes("")` é
    // `true`, então uma busca sem número ("recurso") casava com TODA tarefa
    // pelo segundo ramo, inclusive as sem processo -- e o quadro continuava
    // mostrando tudo, como se a busca não existisse.
    const digitos = busca.replace(/\D/g, "");
    const bateBusca =
      !busca ||
      t.titulo.toLowerCase().includes(busca) ||
      (digitos !== "" && (t.processo_numero || "").includes(digitos));
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
            <>
              {/* O quadro é configuração do escritório -- `admin`, como o
                  servidor exige. A tarefa é trabalho do dia e fica aberta a
                  qualquer membro. */}
              {papelAtende("admin") && (
                <Botao variante="ghost" onClick={() => setEditandoQuadro(true)}>
                  Editar quadro
                </Botao>
              )}
              <Botao onClick={() => setCriandoNaColuna(colunas[0]?.coluna_id ?? "")}>
                <IconePlus />
                Nova tarefa
              </Botao>
            </>
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
                {colunasVisiveis.map((c) => (
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

      {editandoQuadro && (
        <ModalDoQuadro
          subgrupoId={subgrupoId}
          subgrupoNome={subgrupos.find((s) => s.subgrupo_id === subgrupoId)?.nome ?? ""}
          colunas={colunas}
          onFechar={() => setEditandoQuadro(false)}
        />
      )}

      {(tarefaAberta || criandoNaColuna !== null) && (
        <ModalDeTarefa
          tarefa={tarefaAberta}
          subgrupoAtual={subgrupoId}
          subgrupos={subgrupos}
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
