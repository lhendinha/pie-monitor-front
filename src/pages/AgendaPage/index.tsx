import { Box, Grid } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import {
  Botao,
  CabecalhoDePagina,
  Cartao,
  EstadoDeErro,
  Esqueleto,
  IconePlus,
  ConfirmacaoDeExclusaoEmLote,
  ModalDeTarefa,
} from "../../components";
import { BarraDeSelecao } from "../../components";
import { useToastOnQueryError } from "../../services/queryClient";
import { useAssuntosDasTarefas } from "./hooks/useAssuntosDasTarefas";
import { useNomeDeSubgrupo } from "../../hooks/useNomeDeSubgrupo";
import { hojeISO } from "../../utils";
import { paraIso } from "../../utils/calendario";
import AreaDaVisao from "./components/AreaDaVisao";
import BarraDeDatas from "./components/BarraDeDatas";
import CartaoDeHoje from "./components/CartaoDeHoje";
import FiltrosDaAgenda from "./components/FiltrosDaAgenda";
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
import { podeAgirEmLote, podeListarPessoas } from "../../utils/permissoes";
import { useAcoesEmLote } from "../../hooks/useAcoesEmLote";
import { chaveDe, contarVinculadas, estadoDaCaixaDoTopo } from "../../utils";
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

  /* 🔴 A seleção age sobre `visiveis` -- o que o FILTRO deixou na tela --, e
     não sobre `tarefas`. Aqui o filtro de pessoa é aplicado no CLIENTE sobre
     o período já baixado, então "selecionar todas as N" não custa
     requisição nenhuma: os ids já estão em mãos. */
  const { selecao, confirmando, setConfirmando, excluir } = useAcoesEmLote();
  const selecionando = selecao.escopo === "agenda";

  const marcadas = visiveis.filter(selecao.estaMarcada);
  const chavesVisiveis = visiveis.map(chaveDe);

  /* 🔴 UMA função para as DUAS listas da tela. A pilha de dias e o cartão
     "Hoje" mostram as MESMAS tarefas (`doDiaDeHoje` sai de `visiveis`), e a
     primeira versão só deu caixa à pilha: a mesma tarefa aparecia
     selecionável de um lado e como botão de abrir do outro. Marcá-la aqui
     acende a caixa lá, porque a seleção guarda CHAVE, não posição.

     ⚠️ A ordem do Shift é `chavesVisiveis` -- a do período inteiro, não a do
     cartão. É o que faz o intervalo significar a mesma coisa nas duas. */
  const selecaoDaLinha = selecionando
    ? (t: Tarefa) => ({
        marcada: selecao.estaMarcada(t),
        onAlternar: (comShift: boolean) => selecao.alternar(t, chavesVisiveis, comShift),
      })
    : undefined;

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
          <>
            {/* Some com a barra de pé: ela é a moldura do modo. */}
            {podeAgirEmLote() && !selecionando && visiveis.length > 0 && (
              <Botao
                variante="ghost"
                onClick={() => {
                  /* 🔴 Entrar TROCA a visão junto, e não é conveniência: a
                     Agenda abre "Por mês", e o modo de seleção renderiza a
                     LISTA. Sem trocar, a pílula ficaria desabilitada dizendo
                     "Por mês" sobre uma grade sem caixa nenhuma -- ou pior,
                     sem linha alguma para marcar. É exatamente o que
                     "Atrasadas" já faz em `FiltrosDaAgenda`.

                     ⚠️ Sair NÃO devolve a visão anterior: a pessoa fica em
                     "Em lista", que é o que ela está vendo. Restaurar seria
                     a tela mudando sozinha sem ninguém pedir. */
                  setFiltros((atual) => ({ ...atual, visao: "lista" }));
                  selecao.entrar("agenda");
                }}
              >
                Selecionar
              </Botao>
            )}
            <Botao onClick={() => setCriando(true)} disabled={subgrupos.primeiraPagina.length === 0}>
              <IconePlus />
              Nova tarefa
            </Botao>
          </>
        }
      />

      <FiltrosDaAgenda
        subgrupos={subgrupos}
        pessoas={pessoas}
        mostrarPessoas={podeListarPessoas()}
        filtros={filtros}
        selecionando={selecionando}
        onMudar={(parcial) => {
          /* ⚠️ Mudar de filtro LIMPA a seleção: a contagem passaria a falar
             de tarefa que saiu da tela, e o lote apagaria o que ninguém vê. */
          if (selecionando) selecao.limpar();
          setFiltros((atual) => ({ ...atual, ...parcial }));
        }}
      />

      {/* 🔴 A barra fica ACIMA da pilha de dias, e não dentro de um: a
          contagem é do PERÍODO inteiro, e um dia não pode falar por ele. */}
      {selecionando && (
        <Box mb="14px">
          <BarraDeSelecao
            marcadas={selecao.marcadas.size}
            total={visiveis.length}
            estadoDaCaixa={estadoDaCaixaDoTopo(marcadas.length, visiveis.length)}
            vinculadas={contarVinculadas(marcadas)}
            onAlternarTopo={() => selecao.alternarTodas(chavesVisiveis)}
            onTodas={() =>
              selecao.marcadas.size >= visiveis.length
                ? selecao.limpar()
                : selecao.alternarTodas(chavesVisiveis)
            }
            onCancelar={selecao.sair}
            onExcluir={() => setConfirmando(marcadas)}
            excluindo={excluir.isPending}
          />
        </Box>
      )}

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
              selecaoDe={selecaoDaLinha}
            />
          )}
        </Box>

        <CartaoDeHoje
          hoje={hoje}
          tarefas={doDiaDeHoje}
          carregando={carregando}
          atrasadas={atrasadas}
          subgrupoNome={subgrupoNome}
          assuntoDoAtendimento={assuntoDoAtendimento}
          onAbrir={setTarefaAberta}
          selecaoDe={selecaoDaLinha}
        />
      </Grid>

      {/* Irmão FIXO do conteúdo, como o `Modal` exige: dentro de um ramo
          condicional, uma troca de ramo com ele aberto o remonta vazio. */}
      {confirmando && (
        <ConfirmacaoDeExclusaoEmLote
          tarefas={confirmando}
          subgrupoNome={subgrupoNome}
          excluindo={excluir.isPending}
          onConfirmar={() => excluir.mutate(confirmando)}
          onFechar={() => setConfirmando(null)}
        />
      )}

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
