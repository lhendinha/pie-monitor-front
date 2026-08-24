import { Box, Grid, Stack } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  Botao,
  CabecalhoDePagina,
  Cartao,
  EstadoDeErro,
  EstadoVazio,
  Esqueleto,
  IconePlus,
  ModalDeTarefa,
} from "../../components";
import { TETO_POR_PAGINA } from "../../constants";
import {
  listarAtendimentos,
  listarTodosOsMembrosDoGrupo,
  listarQuadro,
  listarSubgrupos,
  papelAtende,
} from "../../services";
import { useToastOnQueryError } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import { hojeISO } from "../../utils";
import { paraIso } from "../../utils/calendario";
import BarraDeDatas from "./components/BarraDeDatas";
import FiltrosDaAgenda from "./components/FiltrosDaAgenda";
import LinhaDeTarefa from "./components/LinhaDeTarefa";
import ListaDeUmDia from "./components/ListaDeUmDia";
import VisaoPorMes from "./components/VisaoPorMes";
import VisaoPorSemana from "./components/VisaoPorSemana";
import { useQuadrosDosSubgrupos } from "./hooks/useQuadrosDosSubgrupos";
import { useTarefasDaAgenda } from "./hooks/useTarefasDaAgenda";
import { agruparPorDia } from "./helpers/tarefasPorDia";
import {
  DIAS_DA_LISTA,
  dataPadraoDaNovaTarefa,
  intervaloDaVisao,
  navegar,
  rotuloDoPeriodo,
  somarDias,
} from "./helpers/periodoDaAgenda";
import type { FiltrosDaAgenda as Filtros } from "./types";
import type {
  RespostaDeAtendimentosResumidos,
  RespostaDeMembros,
  RespostaDeSubgrupos,
  RespostaDoQuadro,
} from "../../types/respostas";
import type { Tarefa } from "../../types";

/** Agenda: as tarefas do escritório projetadas por data.
 *
 * ⚠️ É uma PROJEÇÃO, nunca uma cópia -- a mesma lista do Kanban e da Área de
 * trabalho, lida por `data`. Criar tarefa aqui abre o mesmo modal do quadro,
 * e concluir lá reflete aqui na consulta seguinte.
 *
 * Abre "Por mês", como o artifact (`agendaView = 'mes'`): a pergunta que
 * traz alguém à agenda é "como está a minha semana/mês", e a visão de um dia
 * só responde uma fração dela.
 */
export default function AgendaPage() {
  /* `hoje` fixado no primeiro render: recalcular a cada um faria a tela
     mudar sozinha na virada da meia-noite, no meio de uma navegação. */
  const [hoje] = useState(() => new Date());
  const [dataVisivel, setDataVisivel] = useState(() => new Date());
  const [filtros, setFiltros] = useState<Filtros>({
    visao: "mes",
    subgrupoIds: [],
    pessoa: "todas",
  });
  const [tarefaAberta, setTarefaAberta] = useState<Tarefa | null>(null);
  const [criando, setCriando] = useState(false);

  const isoDeHoje = hojeISO();

  const subgruposQuery = useQuery<RespostaDeSubgrupos>({
    queryKey: qk.subgrupos({ tamanhoPagina: TETO_POR_PAGINA }),
    queryFn: () => listarSubgrupos({ tamanhoPagina: TETO_POR_PAGINA }),
  });
  useToastOnQueryError(subgruposQuery.error, "Não foi possível carregar os subgrupos.");
  const subgrupos = subgruposQuery.data?.subgrupos || [];

  const membrosQuery = useQuery<RespostaDeMembros>({
    queryKey: qk.todosOsMembros(),
    queryFn: listarTodosOsMembrosDoGrupo,
    enabled: papelAtende("manager"),
  });
  const membros = membrosQuery.data?.membros || [];

  const intervalo = intervaloDaVisao(filtros.visao, dataVisivel);
  const tarefasQuery = useTarefasDaAgenda(filtros.subgrupoIds, intervalo);
  useToastOnQueryError(tarefasQuery.error, "Não foi possível carregar as tarefas.");

  /* Os quadros de quem está à vista -- é deles que sai "esta tarefa está
     concluída". Sem subgrupo escolhido são todos, que é o que a consulta de
     tarefas também traz. */
  const subgruposExibidos = filtros.subgrupoIds.length
    ? filtros.subgrupoIds
    : subgrupos.map((s) => s.subgrupo_id);
  const {
    carregando: carregandoQuadros,
    algumFalhou: quadrosFalharam,
    estaConcluida,
    nomeDaColuna,
  } = useQuadrosDosSubgrupos(subgruposExibidos);

  // 🔴 Sem este aviso, uma falha ao carregar os quadros fazia a Agenda
  // afirmar o contrário do que é: toda tarefa concluída aparecia em aberto,
  // sem tachado e sem o nome da coluna. O toast é o mesmo tratamento que as
  // outras consultas da página já recebem.
  useToastOnQueryError(
    quadrosFalharam ? new Error("quadros") : null,
    "Não foi possível carregar os quadros -- o que está concluído pode aparecer como pendente.",
  );

  /** Assunto dos atendimentos vinculados, pra linha dizer a que a tarefa se
   * liga em vez de mostrar um id. */
  const atendimentosQuery = useQuery<RespostaDeAtendimentosResumidos>({
    queryKey: qk.atendimentos({ tamanhoPagina: TETO_POR_PAGINA }),
    queryFn: () => listarAtendimentos({ tamanhoPagina: TETO_POR_PAGINA }),
  });
  const assuntoPorId = useMemo(
    () =>
      new Map(
        (atendimentosQuery.data?.atendimentos || []).map((a) => [a.atendimento_id, a.assunto]),
      ),
    [atendimentosQuery.data],
  );

  const tarefas = tarefasQuery.data || [];
  const visiveis = useMemo(() => {
    if (filtros.pessoa === "todas") return tarefas;
    if (filtros.pessoa === "sem") return tarefas.filter((t) => !t.responsavel_id);
    return tarefas.filter((t) => t.responsavel_id === filtros.pessoa);
  }, [tarefas, filtros.pessoa]);

  const porDia = useMemo(() => agruparPorDia(visiveis), [visiveis]);
  const doDiaDeHoje = porDia.get(isoDeHoje) || [];

  /* O quadro do subgrupo da tarefa aberta: o modal precisa das colunas dela,
     e cada subgrupo tem o próprio quadro. Na criação, o primeiro exibido --
     o modal deixa trocar. */
  const subgrupoDoModal =
    tarefaAberta?.subgrupo_id || subgruposExibidos[subgruposExibidos.length - 1] || "";
  const quadroDoModalQuery = useQuery<RespostaDoQuadro>({
    queryKey: qk.quadro(subgrupoDoModal),
    queryFn: () => listarQuadro(subgrupoDoModal),
    enabled: Boolean(subgrupoDoModal) && (Boolean(tarefaAberta) || criando),
  });

  function abrirDia(iso: string) {
    // `T00:00:00` força leitura LOCAL: `new Date("2026-08-19")` é meia-noite
    // UTC, que no Brasil cai no dia anterior.
    setDataVisivel(new Date(`${iso}T00:00:00`));
    setFiltros((atual) => ({ ...atual, visao: "dia" }));
  }

  function fecharModal() {
    setTarefaAberta(null);
    setCriando(false);
  }

  /* Os quadros entram na espera: sem eles a lista sai com a tarefa concluída
     SEM risco e a risca meio segundo depois -- no intervalo, a tela afirma o
     contrário do que é. Custa uma onda a mais (subgrupos -> quadros), e o
     cache é o mesmo do Kanban, então em geral já vem quente. */
  const carregando =
    subgruposQuery.isPending || tarefasQuery.isPending || carregandoQuadros;

  return (
    <Box>
      <CabecalhoDePagina
        titulo="Agenda"
        subtitulo="As tarefas do escritório organizadas por data."
        acoes={
          <Botao onClick={() => setCriando(true)} disabled={subgrupos.length === 0}>
            <IconePlus />
            Nova tarefa
          </Botao>
        }
      />

      <FiltrosDaAgenda
        subgrupos={subgrupos}
        membros={membros}
        filtros={filtros}
        carregandoSubgrupos={subgruposQuery.isPending}
        onMudar={(parcial) => setFiltros((atual) => ({ ...atual, ...parcial }))}
      />

      {/* 320px na lateral, como o artifact (`.agenda-layout`). Uma coluna só
          abaixo de 980px -- o "Hoje" vira um bloco embaixo em vez de espremer
          o calendário. */}
      <Grid templateColumns={{ base: "1fr", lg: "1fr 320px" }} gap="20px" alignItems="start">
        <Box minW="0">
          <BarraDeDatas
            rotulo={rotuloDoPeriodo(filtros.visao, dataVisivel)}
            onNavegar={(passo) =>
              setDataVisivel((atual) => navegar(filtros.visao, atual, passo))
            }
            onHoje={() => setDataVisivel(new Date())}
          />

          {carregando ? (
            <Esqueleto linhas={6} />
          ) : tarefasQuery.isError ? (
            <Cartao>
              <EstadoDeErro
                mensagem="Não foi possível carregar as tarefas."
                onTentarDeNovo={() => tarefasQuery.refetch()}
                tentando={tarefasQuery.isFetching}
              />
            </Cartao>
          ) : (
            <AreaDaVisao
              filtros={filtros}
              dataVisivel={dataVisivel}
              isoDeHoje={isoDeHoje}
              porDia={porDia}
              estaConcluida={estaConcluida}
              nomeDaColuna={nomeDaColuna}
              assuntoDoAtendimento={(id) => assuntoPorId.get(id)}
              onAbrirTarefa={setTarefaAberta}
              onEscolherDia={abrirDia}
            />
          )}
        </Box>

        {/* "Hoje" fixo na lateral, INDEPENDENTE do que está navegado: é o
            ponto de retorno de quem foi olhar outro mês. */}
        <Cartao titulo={`Hoje · ${new Intl.DateTimeFormat("pt-BR").format(hoje)}`}>
          {carregando ? (
            <Box px="16px" py="10px">
              <Esqueleto linhas={3} />
            </Box>
          ) : doDiaDeHoje.length === 0 ? (
            <EstadoVazio mensagem="Nenhuma tarefa para hoje." />
          ) : (
            <Box px="16px" py="4px">
              {doDiaDeHoje.map((tarefa, indice) => (
                <LinhaDeTarefa
                  key={`${tarefa.subgrupo_id}:${tarefa.tarefa_id}`}
                  tarefa={tarefa}
                  concluida={estaConcluida(tarefa)}
                  nomeDaColuna={nomeDaColuna(tarefa)}
                  assuntoDoAtendimento={
                    tarefa.atendimento_id ? assuntoPorId.get(tarefa.atendimento_id) : undefined
                  }
                  onAbrir={setTarefaAberta}
                  ultima={indice === doDiaDeHoje.length - 1}
                />
              ))}
            </Box>
          )}
        </Cartao>
      </Grid>

      {(tarefaAberta || criando) && (
        <ModalDeTarefa
          tarefa={tarefaAberta}
          subgrupoAtual={subgrupoDoModal}
          subgrupos={subgrupos}
          colunas={quadroDoModalQuery.data?.colunas || []}
          carregandoColunas={quadroDoModalQuery.isPending}
          membros={membros}
          dataInicial={
            criando ? dataPadraoDaNovaTarefa(filtros.visao, dataVisivel, hoje) : undefined
          }
          onSalvo={() => {
            fecharModal();
            tarefasQuery.refetch();
          }}
          onFechar={fecharModal}
        />
      )}
    </Box>
  );
}

interface PropsDaArea {
  filtros: Filtros;
  dataVisivel: Date;
  isoDeHoje: string;
  porDia: Map<string, Tarefa[]>;
  estaConcluida: (tarefa: Tarefa) => boolean;
  nomeDaColuna: (tarefa: Tarefa) => string | undefined;
  assuntoDoAtendimento: (id: string) => string | undefined;
  onAbrirTarefa: (tarefa: Tarefa) => void;
  onEscolherDia: (iso: string) => void;
}

/** Escolhe a visão. Separado do corpo da página só pra que o `return` dela
 * caiba num olhar -- quatro ternários aninhados no meio do JSX escondem a
 * estrutura da tela. */
function AreaDaVisao({
  filtros,
  dataVisivel,
  isoDeHoje,
  porDia,
  estaConcluida,
  nomeDaColuna,
  assuntoDoAtendimento,
  onAbrirTarefa,
  onEscolherDia,
}: PropsDaArea) {
  if (filtros.visao === "semana") {
    return (
      <VisaoPorSemana
        data={dataVisivel}
        isoDeHoje={isoDeHoje}
        porDia={porDia}
        estaConcluida={estaConcluida}
        onEscolherDia={onEscolherDia}
      />
    );
  }

  if (filtros.visao === "mes") {
    return (
      <VisaoPorMes
        data={dataVisivel}
        isoDeHoje={isoDeHoje}
        porDia={porDia}
        onEscolherDia={onEscolherDia}
      />
    );
  }

  if (filtros.visao === "dia") {
    const tarefas = porDia.get(paraIso(dataVisivel)) || [];
    if (tarefas.length === 0) {
      return (
        <Cartao>
          <EstadoVazio mensagem="Nenhuma tarefa com data neste dia." />
        </Cartao>
      );
    }
    return (
      <ListaDeUmDia
        data={dataVisivel}
        tarefas={tarefas}
        estaConcluida={estaConcluida}
        nomeDaColuna={nomeDaColuna}
        assuntoDoAtendimento={assuntoDoAtendimento}
        onAbrir={onAbrirTarefa}
        /* A barra de datas logo acima já diz que dia é este. */
        comData={false}
      />
    );
  }

  /* Em lista: só os dias COM tarefa, na ordem. Mostrar catorze cabeçalhos
     pra encontrar três com conteúdo faria rolar a tela à toa. */
  const dias = Array.from({ length: DIAS_DA_LISTA }, (_, i) => somarDias(dataVisivel, i))
    .map((dia) => ({ dia, tarefas: porDia.get(paraIso(dia)) || [] }))
    .filter((grupo) => grupo.tarefas.length > 0);

  if (dias.length === 0) {
    return (
      <Cartao>
        <EstadoVazio mensagem={`Nenhuma tarefa nos próximos ${DIAS_DA_LISTA} dias.`} />
      </Cartao>
    );
  }

  return (
    <Stack gap="12px">
      {dias.map(({ dia, tarefas }) => (
        <ListaDeUmDia
          key={paraIso(dia)}
          data={dia}
          tarefas={tarefas}
          estaConcluida={estaConcluida}
          nomeDaColuna={nomeDaColuna}
          assuntoDoAtendimento={assuntoDoAtendimento}
          onAbrir={onAbrirTarefa}
        />
      ))}
    </Stack>
  );
}
