import { Box, Grid } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

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
import { useToastOnQueryError } from "../../services/queryClient";
import { useAssuntosDasTarefas } from "./hooks/useAssuntosDasTarefas";
import { useNomeDeSubgrupo } from "../../hooks/useNomeDeSubgrupo";
import { hojeISO } from "../../utils";
import { paraIso } from "../../utils/calendario";
import AreaDaVisao from "./components/AreaDaVisao";
import BarraDeDatas from "./components/BarraDeDatas";
import FiltrosDaAgenda from "./components/FiltrosDaAgenda";
import LinhaDeTarefa from "./components/LinhaDeTarefa";
import { useTarefasDaAgenda } from "./hooks/useTarefasDaAgenda";
import { agruparPorDia } from "./tarefasPorDia";
import {
  dataPadraoDaNovaTarefa,
  intervaloDaVisao,
  navegar,
  rotuloDeAtrasadas,
  rotuloDoPeriodo,
} from "./periodoDaAgenda";
import type { FiltrosDaAgenda as Filtros, PeriodoDaAgenda } from "./types";
import type { OpcaoDeSelect, Tarefa } from "../../types";
import { podeListarPessoas } from "../../utils/permissoes";
import { usePessoasBuscaveis } from "../../hooks/usePessoasBuscaveis";
import { useSubgruposBuscaveis } from "../../hooks/useSubgruposBuscaveis";

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
  /** A Área de trabalho abre esta tela já no modo atrasadas: clicar em
   * "Tarefas atrasadas" tem que mostrar exatamente as que geraram o número.
   *
   * Por `state` da navegação e não por query string, como `ProcessosPage` e
   * `AtendimentosPage`: é atalho interno, não URL pra compartilhar. */
  const { state } = useLocation();
  const navegacao = state as { periodo?: PeriodoDaAgenda } | null;

  /* `hoje` fixado no primeiro render: recalcular a cada um faria a tela
     mudar sozinha na virada da meia-noite, no meio de uma navegação. */
  const [hoje] = useState(() => new Date());
  const [dataVisivel, setDataVisivel] = useState(() => new Date());
  const [filtros, setFiltros] = useState<Filtros>({
    /* 🔴 Chegando no modo atrasadas, a visão nasce em LISTA -- não em "mes".
       O modo ignora o calendário e renderiza a lista de qualquer jeito; com
       `visao` em "mes" a pílula (desabilitada) exibiria "Por mês" sobre uma
       lista corrida. Rótulo dizendo uma coisa e conteúdo sendo outra é
       exatamente o defeito que esta tela acabou de perder. */
    visao: navegacao?.periodo === "atrasadas" ? "lista" : "mes",
    subgrupoIds: [],
    subgrupoNomes: {},
    pessoa: "todas",
    /* A Área de trabalho abre esta tela já no modo atrasadas -- é o destino
       do card "Tarefas atrasadas", que antes não tinha nenhum. Só na
       PRIMEIRA montagem: depois quem manda é a pílula. */
    periodo: navegacao?.periodo ?? "todos",
  });
  const [tarefaAberta, setTarefaAberta] = useState<Tarefa | null>(null);
  const [criando, setCriando] = useState(false);

  const isoDeHoje = hojeISO();

  /* A primeira página já na montagem: "nenhum escolhido = todos" precisa de
     uma lista pra saber de quais subgrupos buscar o quadro. */
  const subgrupos = useSubgruposBuscaveis(true);
  /* Só quando a pílula de pessoas abrir. */
  const pessoas = usePessoasBuscaveis();

  const intervalo = intervaloDaVisao(filtros.visao, dataVisivel);
  const atrasadas = filtros.periodo === "atrasadas";
  const tarefasQuery = useTarefasDaAgenda(filtros.subgrupoIds, intervalo, filtros.periodo);
  useToastOnQueryError(tarefasQuery.error, "Não foi possível carregar as tarefas.");

  /* Os quadros de quem está à vista -- é deles que sai "esta tarefa está
     concluída". Sem subgrupo escolhido são todos, que é o que a consulta de
     tarefas também traz. */
  const subgruposExibidos = filtros.subgrupoIds.length
    ? filtros.subgrupoIds
    /* ⚠️ `primeiraPagina`, NUNCA `opcoes`: "nenhum escolhido = TODOS", e
       `opcoes` encolhe enquanto a pessoa digita na pílula. Lendo dali, buscar
       "fam" fazia a agenda passar a mostrar só Família -- sem ninguém ter
       aplicado nada. */
    : subgrupos.primeiraPagina.map((o: OpcaoDeSelect) => o.value);
  /* 🔴 Aqui existia o hook useQuadrosDosSubgrupos (removido) -- 96 linhas e UMA REQUISIÇÃO
     POR SUBGRUPO exibido, só pra saber o nome da coluna e se a tarefa estava
     concluída. Hoje isso vem NA tarefa (`coluna_nome`, `esta_concluida`),
     resolvido pelo servidor.

     Foram embora junto três coisas que só existiam por causa dele:

     - o TETO de 50. A lista de quadros saía de `primeiraPagina`, enquanto a
       consulta de tarefas trazia todos os subgrupos visíveis -- acima de 50,
       tarefa concluída aparecia como pendente, sem tachado;
     - o aviso persistente "não foi possível carregar os quadros", que
       existia porque a lista podia chegar SEM eles e a tela então afirmava o
       contrário do que é. Agora os campos vêm na mesma resposta: ou ela
       chega inteira e verdadeira, ou falha e o erro da lista já cobre;
     - a espera extra (`carregandoQuadros`) e a onda a mais de requisições.

     ⚠️ `subgruposExibidos` FICA -- o modal usa pra saber em que subgrupo
     abrir. */

  /** Assunto dos atendimentos vinculados, pra linha dizer a que a tarefa se
   * liga em vez de mostrar um id. */
  /* ⚠️ O hook vem DEPOIS de `tarefas` -- ele pede só os atendimentos que as
   * tarefas da tela referenciam. Ver `useAssuntosDasTarefas`. */
  /* ⚠️ `useMemo`, e não `|| []` solto: sem isto cada render sem dados criava
     um array NOVO, e o `useMemo` de `visiveis` logo abaixo recomputava a cada
     render -- era o que o lint apontava. */
  const tarefas = useMemo(() => tarefasQuery.data || [], [tarefasQuery.data]);
  const { assuntoDoAtendimento } = useAssuntosDasTarefas(tarefas);
  /* UMA vez na página, não uma por linha -- mesma razão do assunto acima. */
  const subgrupoNome = useNomeDeSubgrupo();
  const visiveis = useMemo(() => {
    if (filtros.pessoa === "todas") return tarefas;
    if (filtros.pessoa === "sem") return tarefas.filter((t) => !t.responsavel_id);
    return tarefas.filter((t) => t.responsavel_id === filtros.pessoa);
  }, [tarefas, filtros.pessoa]);

  const porDia = useMemo(() => agruparPorDia(visiveis), [visiveis]);
  const doDiaDeHoje = porDia.get(isoDeHoje) || [];

  /* Em que subgrupo o modal ABRE: o da tarefa aberta, ou -- criando -- o
     primeiro exibido. Daí em diante quem manda é o seletor do próprio modal,
     que carrega o quadro e os membros do subgrupo escolhido. Buscar o quadro
     aqui era o que prendia a criação ao subgrupo da tela. */
  /** 🔴 O primeiro, não o último. O comentário antigo dizia que o último era
   * "o mais recente"; a listagem passou a vir em ordem ALFABÉTICA, então o
   * último é só o último do alfabeto -- e mesmo antes, "mais recente" nunca
   * foi "o que a pessoa quer". Aqui o padrão importa pouco (é só o subgrupo
   * em que o modal ABRE, e o campo é editável ao criar), então o primeiro da
   * lista visível basta e não finge saber mais do que sabe. */
  const subgrupoDoModal = tarefaAberta?.subgrupo_id || subgruposExibidos[0] || "";

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

  const carregando = subgrupos.carregandoPrimeiraVez || tarefasQuery.isPending;

  return (
    <Box>
      <CabecalhoDePagina
        titulo="Agenda"
        subtitulo="As tarefas do escritório organizadas por data."
        acoes={
          <Botao onClick={() => setCriando(true)} disabled={subgrupos.primeiraPagina.length === 0}>
            <IconePlus />
            Nova tarefa
          </Botao>
        }
      />

      <FiltrosDaAgenda
        subgrupos={subgrupos}
        pessoas={pessoas}
        mostrarPessoas={podeListarPessoas()}
        filtros={filtros}
        onMudar={(parcial) => setFiltros((atual) => ({ ...atual, ...parcial }))}
      />

      {/* 320px na lateral, como o artifact (`.agenda-layout`). Uma coluna só
          abaixo de 980px -- o "Hoje" vira um bloco embaixo em vez de espremer
          o calendário. */}
      <Grid templateColumns={{ base: "1fr", lg: "1fr 320px" }} gap="20px" alignItems="start">
        <Box minW="0">
          {/* 🔴 No modo atrasadas as setas e o "Hoje" saem: a lista ignora o
              calendário, então navegar período não muda nada. O RÓTULO fica,
              mas dizendo o que está sendo mostrado -- manter "Agosto de 2026" sobre
              uma lista de julho seria a tela afirmando o contrário do que é. */}
          <BarraDeDatas
            semNavegacao={atrasadas}
            rotulo={
              atrasadas
                ? rotuloDeAtrasadas(hoje)
                : rotuloDoPeriodo(filtros.visao, dataVisivel)
            }
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
              assuntoDoAtendimento={assuntoDoAtendimento}
              subgrupoNome={subgrupoNome}
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
          ) : atrasadas ? (
            /* 🔴 "Nenhuma tarefa para hoje" seria MENTIRA aqui, e uma
               mentira que a tela não tem como perceber: no modo atrasadas a
               consulta pede `data_ate: ontem`, então as de hoje nunca vêm --
               a pessoa pode ter cinco e o cartão diria zero.
               Lista vazia sem dizer por quê é o defeito que este projeto
               persegue; aqui o "por quê" é o próprio filtro. */
            <EstadoVazio mensagem="Em Atrasadas a lista traz só o passado — as de hoje não entram." />
          ) : doDiaDeHoje.length === 0 ? (
            <EstadoVazio mensagem="Nenhuma tarefa para hoje." />
          ) : (
            <Box px="16px" py="4px">
              {doDiaDeHoje.map((tarefa, indice) => (
                <LinhaDeTarefa
                  key={`${tarefa.subgrupo_id}:${tarefa.tarefa_id}`}
                  tarefa={tarefa}
                  concluida={tarefa.esta_concluida ?? false}
                  nomeDaColuna={tarefa.coluna_nome ?? undefined}
                  subgrupoNome={subgrupoNome(tarefa.subgrupo_id)}
                  assuntoDoAtendimento={
                    tarefa.atendimento_id ? assuntoDoAtendimento(tarefa.atendimento_id) : undefined
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
          subgrupoAtualNome={
            subgrupos.primeiraPagina.find((o: OpcaoDeSelect) => o.value === subgrupoDoModal)?.label ??
            filtros.subgrupoNomes[subgrupoDoModal] ??
            ""
          }
          dataInicial={
            /* ⚠️ No modo atrasadas o padrão é HOJE, e não o que
               `dataPadraoDaNovaTarefa` derivaria: ela usa a janela da visão,
               e aqui não há janela -- a data visível pode ter ficado num mês
               que a pessoa navegou antes de ligar o filtro, e a tarefa nova
               nasceria lá. Ninguém cria tarefa querendo que ela já nasça
               atrasada. */
            criando
              ? atrasadas
                ? paraIso(hoje)
                : dataPadraoDaNovaTarefa(filtros.visao, dataVisivel, hoje)
              : undefined
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
