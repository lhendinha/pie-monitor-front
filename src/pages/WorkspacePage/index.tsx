import { Box, Grid, Stack } from "@chakra-ui/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { Avatar, BarraDeSelecao, CabecalhoDePagina, ModalDeConfirmacao } from "../../components";
import { useToast } from "../../contexts/ToastContext";
import { getApelido, getEmail, resumoDaAreaDeTrabalho } from "../../services";
import { toastErroMutation, useToastOnQueryError } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import BotaoDeAssumir from "./components/BotaoDeAssumir";
import BotaoDeConcluir from "./components/BotaoDeConcluir";
import CardDeTarefas from "./components/CardDeTarefas";
import CardDeVencimentos from "./components/CardDeVencimentos";
import { DIAS_DO_A_PAGAR } from "../FinanceiroPage/constants";
import { DESTAQUE_MS } from "./constants";
import MinhasAtividades from "./components/MinhasAtividades";
import ResumoRapido from "./components/ResumoRapido";
import { useAssumirTarefa } from "./hooks/useAssumirTarefa";
import { useConcluirTarefa } from "./hooks/useConcluirTarefa";
import { useSelecaoDeTarefas } from "../../hooks/useSelecaoDeTarefas";
import { useExcluirTarefasEmLote } from "../../hooks/useExcluirTarefasEmLote";
import CaixaDaLinha from "./components/CaixaDaLinha";
import { podeAgirEmLote } from "../../utils/permissoes";
import { chaveDe, contar, contarVinculadas, estadoDaCaixaDoTopo, fraseDoResultado } from "../../utils";
import { useNomeDeSubgrupo } from "../../hooks/useNomeDeSubgrupo";
import type { ResumoDaAreaDeTrabalho, Tarefa } from "../../types";

/** Área de trabalho: o resumo do dia.
 *
 * Duas colunas, como no artifact: à esquerda o que há pra fazer (listas de
 * tarefa), à direita o panorama (contagens). A da esquerda é mais larga
 * porque lá cada linha tem título, meta e prazo; a da direita são números.
 *
 * O avatar de responsável não precisa de consulta nenhuma: num card as
 * tarefas são todas minhas (uso o apelido da sessão), no outro nenhuma tem
 * dono -- e ali o avatar vazio É o botão de assumir.
 */
export default function WorkspacePage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const meuEmail = getEmail();
  const meuNome = getApelido() || meuEmail || "";

  const resumoQuery = useQuery<ResumoDaAreaDeTrabalho>({
    queryKey: qk.resumo(),
    queryFn: resumoDaAreaDeTrabalho,
  });
  useToastOnQueryError(resumoQuery.error, "Não foi possível carregar o resumo.");

  /** Depois de concluir ou assumir, o que muda não é só a lista: os números
   * do resumo mudam junto. Invalidar os dois mantém o card e a contagem
   * contando a mesma história. */
  function recarregar() {
    queryClient.invalidateQueries({ queryKey: ["tarefas"] });
    queryClient.invalidateQueries({ queryKey: qk.resumo() });
  }

  /** "Tarefas sem responsável", no Resumo rápido, conta exatamente o que o
   * card "Disponíveis para assumir" lista -- mesmo filtro, mesma tela.
   *
   * 🔴 Rolar E destacar, não só rolar. Em tela larga as duas colunas cabem
   * juntas, e aí `scrollIntoView` não move nada: o clique não teria resposta
   * nenhuma e pareceria quebrado. O destaque breve é o que liga o número à
   * lista nos dois tamanhos.
   *
   * ⚠️ O `setTimeout` é limpo ao desmontar. Sem isso, sair da tela dentro da
   * janela do destaque chamaria `setState` num componente morto. */
  const cardSemResponsavel = useRef<HTMLDivElement>(null);
  const [destacando, setDestacando] = useState(false);
  const relogioDoDestaque = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(relogioDoDestaque.current), []);

  function verSemResponsavel() {
    /* ⚠️ O destaque PRIMEIRO, e a rolagem com `?.()`. Nesta ordem porque
       `scrollIntoView` não existe em todo ambiente -- no jsdom ele nem é
       função. Chamando antes e sem guarda, o TypeError abortava o handler e
       o destaque nunca acontecia: a interação inteira morria por causa do
       enfeite. */
    setDestacando(true);
    clearTimeout(relogioDoDestaque.current);
    relogioDoDestaque.current = setTimeout(() => setDestacando(false), DESTAQUE_MS);
    cardSemResponsavel.current?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  }

  const concluir = useConcluirTarefa(
    () => {
      recarregar();
      toast.sucesso("Tarefa concluída.");
    },
    (err) => toastErroMutation(toast, err, "Não foi possível concluir."),
  );

  /* 🔴 O escopo mora AQUI, não em cada card: é ele que impede os dois de
     selecionarem ao mesmo tempo, e sem isso "Excluir 7" não diz quais sete. */
  const subgrupoNome = useNomeDeSubgrupo();
  const selecao = useSelecaoDeTarefas();
  const [confirmando, setConfirmando] = useState<Tarefa[] | null>(null);
  /** As N do filtro, guardadas quando alguém pede "todas" -- é delas que o
   * lote sai, porque elas estão fora da página. */
  const [todasDoFiltro, setTodasDoFiltro] = useState<Tarefa[]>([]);
  const [buscandoTodas, setBuscandoTodas] = useState(false);

  function entrarNaSelecao(escopo: string) {
    setTodasDoFiltro([]);
    selecao.entrar(escopo);
  }

  const excluir = useExcluirTarefasEmLote(
    (resultado) => {
      selecao.sair();
      setConfirmando(null);
      toast.sucesso(fraseDoResultado(resultado));
    },
    (err) => {
      setConfirmando(null);
      toastErroMutation(toast, err, "Não foi possível excluir.");
    },
  );

  /** A barra e as caixas de um card. A PÁGINA monta, o card só posiciona --
   * é o que mantém o estado num lugar só com dois cards na tela. */
  function barraDoCard(
    tarefas: Tarefa[],
    total: number,
    carregarTodas: () => Promise<Tarefa[]>,
  ) {
    const chavesDaPagina = tarefas.map(chaveDe);
    const daPagina = tarefas.filter(selecao.estaMarcada);
    /* 🔴 O universo é o que "todas as N" guardou, quando guardou -- senão a
       página visível. Contar só o visível fazia a faixa afirmar "3 delas
       estão vinculadas" com DOZE marcadas, quando o número certo era outro.
       Medido em Chrome em 10/09/2026, e o comentário que estava aqui antes
       chamava isso de honesto. Numa ação destrutiva, aviso subestimado é o
       pior tipo de aviso. */
    const universo = todasDoFiltro.length ? todasDoFiltro : tarefas;
    const marcadas = universo.filter(selecao.estaMarcada);
    return (
      <BarraDeSelecao
        marcadas={selecao.marcadas.size}
        total={total}
        estadoDaCaixa={estadoDaCaixaDoTopo(daPagina.length, tarefas.length)}
        vinculadas={contarVinculadas(marcadas)}
        onAlternarTopo={() => selecao.alternarTodas(chavesDaPagina)}
        onTodas={async () => {
          if (selecao.marcadas.size >= total) return selecao.limpar();
          setBuscandoTodas(true);
          try {
            const todas = await carregarTodas();
            setTodasDoFiltro(todas);
            selecao.alternarTodas(todas.map(chaveDe));
          } catch (err) {
            toastErroMutation(toast, err, "Não foi possível carregar todas.");
          } finally {
            setBuscandoTodas(false);
          }
        }}
        carregandoTodas={buscandoTodas}
        onCancelar={selecao.sair}
        onExcluir={() => {
          /* O que vai para o lote é o MESMO conjunto que a faixa contou --
             a barra não pode avisar sobre um recorte e apagar outro. */
          setConfirmando(marcadas);
        }}
        excluindo={excluir.isPending}
      />
    );
  }

  const assumir = useAssumirTarefa(
    () => {
      recarregar();
      toast.sucesso("Tarefa é sua.");
    },
    (err) => toastErroMutation(toast, err, "Não foi possível assumir."),
  );

  return (
    <>
      <CabecalhoDePagina
        titulo="Área de trabalho"
        subtitulo="Seu resumo do dia — tarefas, prazos e atividade recente."
      />

      <Grid templateColumns={{ base: "1fr", lg: "1.5fr 1fr" }} gap="20px" alignItems="start">
        <Stack gap="20px">
          <CardDeTarefas
            titulo="Minhas tarefas"
            filtro={{ responsavel: "eu" }}
            vazio="Nenhuma tarefa atribuída a você."
            acao={(t) => (
              <BotaoDeConcluir
                rotulo={`Concluir ${t.titulo}`}
                /* SÓ a tarefa clicada, não a lista toda: travar todas as
                   linhas ao concluir uma esconde qual delas está indo, e
                   parece que a tela inteira congelou. */
                desabilitado={concluir.isPending && concluir.variables?.tarefa_id === t.tarefa_id}
                onConcluir={() => concluir.mutate(t)}
              />
            )}
            responsavel={() => <Avatar nome={meuNome} tamanho="pequeno" />}
            escopo="minhas"
            escopoAtivo={selecao.escopo}
            onSelecionar={podeAgirEmLote() ? () => entrarNaSelecao("minhas") : undefined}
            selecao={barraDoCard}
            caixa={(t, ordem) => (
              <CaixaDaLinha
                tarefa={t}
                marcada={selecao.estaMarcada(t)}
                ordem={ordem}
                onAlternar={selecao.alternar}
              />
            )}
          />

          <Box
            ref={cardSemResponsavel}
            borderRadius="lg"
            transition="box-shadow 200ms"
            boxShadow={destacando ? "0 0 0 2px var(--chakra-colors-brand)" : "none"}
          >
          <CardDeTarefas
            titulo="Disponíveis para assumir"
            filtro={{ semResponsavel: true }}
            vazio="Todas as tarefas já têm responsável."
            /* Sem círculo de concluir aqui: não dá pra concluir o que não é
               seu. Assumir vem primeiro. */
            responsavel={(t) => (
              <BotaoDeAssumir
                rotulo={`Assumir ${t.titulo}`}
                desabilitado={
                  (assumir.isPending && assumir.variables?.tarefa.tarefa_id === t.tarefa_id) ||
                  !meuEmail
                }
                onAssumir={() => meuEmail && assumir.mutate({ tarefa: t, email: meuEmail })}
              />
            )}
            escopo="disponiveis"
            escopoAtivo={selecao.escopo}
            onSelecionar={podeAgirEmLote() ? () => entrarNaSelecao("disponiveis") : undefined}
            selecao={barraDoCard}
            caixa={(t, ordem) => (
              <CaixaDaLinha
                tarefa={t}
                marcada={selecao.estaMarcada(t)}
                ordem={ordem}
                onAlternar={selecao.alternar}
              />
            )}
          />
          </Box>

          {/* 🔴 Abaixo de "Disponíveis para assumir", e SÓ para quem pode ver
              dinheiro. O critério é a ausência da chave no resumo, e não um
              papel lido aqui: o servidor já decide quem recebe as chaves, e
              uma segunda régua na tela divergiria da dele no dia em que uma
              das duas mudasse. */}
          {resumoQuery.data?.a_pagar_7_dias_centavos !== undefined && (
            <CardDeVencimentos dias={DIAS_DO_A_PAGAR} />
          )}
        </Stack>

        <Stack gap="20px">
          <MinhasAtividades
            resumo={resumoQuery.data}
            carregando={resumoQuery.isPending}
            falhou={resumoQuery.isError}
            onTentarDeNovo={() => resumoQuery.refetch()}
            tentando={resumoQuery.isFetching}
          />
          <ResumoRapido
            resumo={resumoQuery.data}
            carregando={resumoQuery.isPending}
            falhou={resumoQuery.isError}
            onTentarDeNovo={() => resumoQuery.refetch()}
            tentando={resumoQuery.isFetching}
            onVerSemResponsavel={verSemResponsavel}
          />
        </Stack>
      </Grid>

      {/* 🔴 Irmão fixo do conteúdo, nunca dentro de um ramo condicional: uma
          troca de ramo com ele aberto o REMONTA, e ele volta vazio sem
          ninguém perceber. É a regra do docstring do `Modal`. */}
      {confirmando && (
        <ModalDeConfirmacao
          titulo={`Excluir ${contar(confirmando.length, "tarefa", "tarefas")}`}
          mensagem={
            <>
              Você vai excluir <strong>{contar(confirmando.length, "tarefa", "tarefas")}</strong>
              {" de "}
              {[...new Set(confirmando.map((t) => subgrupoNome(t.subgrupo_id)))].join(", ")}.
            </>
          }
          aviso={
            contarVinculadas(confirmando) > 0
              ? `${contar(contarVinculadas(confirmando), "delas está vinculada", "delas estão vinculadas")} a um processo ativo. O processo não muda — mas o que a tarefa pedia deixa de existir.`
              : undefined
          }
          /* 🔴 O rótulo do modal NÃO pode ser igual ao do gatilho na barra.
             Dois botões com o mesmo nome acessível no mesmo documento fazem
             o leitor de tela anunciar a mesma escolha duas vezes e quebram
             qualquer busca por nome -- é a regra que criou
             `rotuloDeCancelar`, e foi um teste que a pegou aqui.

             O número fica nos DOIS, porque é ele a guarda; o que separa é o
             substantivo, que na confirmação lê melhor de qualquer forma. */
          rotulo={`Excluir ${contar(confirmando.length, "tarefa", "tarefas")}`}
          confirmando={excluir.isPending}
          onConfirmar={() => excluir.mutate(confirmando)}
          onFechar={() => setConfirmando(null)}
        />
      )}
    </>
  );
}
