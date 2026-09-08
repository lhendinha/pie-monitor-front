import { useNavigate } from "react-router-dom";

import { Cartao, EstadoDeErro, Esqueleto } from "../../../../components";
import { emDias, formatarCentavos, hojeISO } from "../../../../utils";
/* O vocabulário do servidor vem de `constants/`, que é de todo mundo. */
import { STATUS_EM_ANDAMENTO, TIPO_ENVIO_MOVIMENTACAO } from "../../../../constants";
/* ⚠️ Os dois únicos imports de constante ENTRE páginas do projeto, e é
   deliberado. A regra da casa é "específico da página mora dentro dela" --
   mas este cartão navega PARA aquelas telas, e o clique tem que aplicar
   exatamente o filtro que o número contou.
   A alternativa seria repetir o `eu` e o `7` aqui, e aí o rótulo do card e
   o filtro do destino divergiriam no primeiro ajuste -- que é o defeito que
   esta rodada inteira existiu pra tirar. Coupling explícito e com uma fonte
   só é melhor que dois literais concordando por sorte. */
import { RESPONSAVEL_EU } from "../../../ProcessosPage/constants";
import { DIAS_DA_JANELA_RECENTE } from "../../../HistoricoPage/constants";
import { DIAS_DO_A_PAGAR } from "../../../FinanceiroPage/constants";
import {
  NATUREZA_ENTRADA,
  NATUREZA_SAIDA,
  PERIODO_TODOS,
  SITUACAO_ATRASADO,
} from "../../../../constants";
import GrupoDeNumeros from "../GrupoDeNumeros";
import type { NumeroDoResumo } from "../../types";
import type { ResumoRapidoProps } from "./types";

/** Os números do dia, cada um levando à lista que o gerou.
 *
 * ⚠️ O número e o destino contam a MESMA história: o clique aplica
 * exatamente o filtro da contagem. É por isso que o rótulo diz "A verificar
 * **até** hoje" -- o filtro de Processos é `<= data`, então o número inclui
 * os atrasados, e "em hoje" seria mentira.
 */
export default function ResumoRapido({
  resumo,
  carregando,
  falhou,
  onTentarDeNovo,
  tentando,
  onVerSemResponsavel,
}: ResumoRapidoProps) {
  const navegar = useNavigate();

  function irParaProcessos(filtros: Record<string, string>) {
    navegar("/processos", { state: { filtros } });
  }

  /** As duas linhas de PRAZO abrem a listagem já filtrada por "eu".
   *
   * 🔴 O servidor conta OS MEUS nesses dois números (a régua "eu seria
   * avisado", que inclui os órfãos). Sem o filtro no clique,
   * o cartão diria 2 e a lista abriria 9 -- exatamente o defeito de que
   * `resumo_service.montar` já se protege: *"o número do card não bateria
   * com a lista que o clique abre"*.
   *
   * ⚠️ `RESPONSAVEL_EU` é traduzido pro e-mail da sessão dentro de
   * `useFiltrosProcessos`. Mandar o e-mail daqui duplicaria essa regra. */
  function irParaMeusPrazos(filtros: Record<string, string>) {
    irParaProcessos({ ...filtros, responsavelId: RESPONSAVEL_EU });
  }

  const atencao: NumeroDoResumo[] = [
    {
      rotulo: "A verificar até hoje",
      valor: resumo?.a_verificar_ate_hoje ?? 0,
      tom: "bad",
      ir: () => irParaMeusPrazos({ dataVerificarAte: hojeISO() }),
    },
    {
      rotulo: "Prazo final em até 7 dias",
      valor: resumo?.prazo_final_em_7_dias ?? 0,
      tom: "warn",
      ir: () => irParaMeusPrazos({ prazoFinalAte: emDias(7) }),
    },
    {
      rotulo: "Tarefas atrasadas",
      valor: resumo?.tarefas_atrasadas ?? 0,
      tom: "bad",
      /* 🔴 O link aponta o MODO "Atrasadas" da Agenda, e não uma visão com
         janela: "Atrasadas" é `data < hoje` em QUALQUER dia passado, e toda
         visão da Agenda é limitada por janela de datas -- mandar pra uma
         delas levaria a uma tela mostrando ZERO das atrasadas, pior que link
         nenhum. A pílula "Todos os períodos" com a opção "Atrasadas" ignora a
         janela, trava a visão em lista e some com a navegação de datas: só
         assim o clique conta a mesma história que o número. */
      ir: () => navegar("/agenda", { state: { periodo: "atrasadas" } }),
    },
    {
      rotulo: "Tarefas sem responsável",
      valor: resumo?.tarefas_sem_responsavel ?? 0,
      tom: "warn",
      ir: onVerSemResponsavel,
    },
    {
      rotulo: "Envios com falha",
      valor: resumo?.envios_com_falha ?? 0,
      tom: "bad",
      /* Falha cruza os DOIS tipos de envio, então vai `tipoEnvio: ""` --
         filtrado em Movimentações, o número não bateria.
         ⚠️ E `apenasComFalha` junto: antes ia só o tipo vazio, e o Histórico
         abria o histórico INTEIRO. Medido em 26/08/2026: o card dizia 2 e a
         lista mostrava 6. */
      ir: () => navegar("/historico", { state: { tipoEnvio: "", apenasComFalha: true } }),
    },
  ];

  /** As três linhas do Financeiro -- ou nenhuma.
   *
   * 🔴 **A ausência das chaves é o critério, e não um papel lido aqui.** O
   * servidor só as manda para `financeiro`+; perguntar o papel na tela
   * criaria uma segunda régua, que divergiria da do servidor no dia em que
   * uma das duas mudasse. Se a chave não veio, a seção não existe.
   *
   * ⚠️ **Os números são do escritório INTEIRO**, fora do recorte por
   * subgrupo do resto do resumo -- dinheiro não é por subgrupo. E a lista
   * que cada clique abre também é do grupo inteiro, então a régua de "o
   * número bate com a lista" se mantém.
   */
  const temFinanceiro = resumo?.a_receber_atrasado_centavos !== undefined;

  function irParaLancamentos(filtros: Record<string, string>) {
    const query = new URLSearchParams({ aba: "lancamentos", ...filtros });
    navegar(`/financeiro?${query}`);
  }

  const financeiro: NumeroDoResumo[] = [
    {
      rotulo: "A receber atrasado",
      valor: resumo?.a_receber_atrasado_centavos ?? 0,
      texto: `R$ ${formatarCentavos(resumo?.a_receber_atrasado_centavos ?? 0)}`,
      tom: "bad",
      /* ⚠️ `periodo=todos`: atrasado é vencimento no passado em QUALQUER dia,
         e o padrão da lista é "Este mês" -- que esconderia o de julho. */
      ir: () =>
        irParaLancamentos({
          periodo: PERIODO_TODOS,
          natureza: NATUREZA_ENTRADA,
          situacao: SITUACAO_ATRASADO,
        }),
    },
    {
      /* 🔴 "até", e não "em": a soma é `vencimento <= hoje + 7`, sem limite
         inferior -- o atrasado de julho continua a pagar. É a mesma lição do
         "A verificar até hoje" logo acima, e "em 7 dias" seria mentira. */
      rotulo: `A pagar até ${DIAS_DO_A_PAGAR} dias`,
      valor: resumo?.a_pagar_7_dias_centavos ?? 0,
      texto: `R$ ${formatarCentavos(resumo?.a_pagar_7_dias_centavos ?? 0)}`,
      tom: "warn",
      /* 🔴 `vencendo`, e não um período: nenhuma combinação de período e
         situação expressa "aberto, vencendo até N dias, atrasados
         inclusive". Sem ele o card diria um número e a lista abriria
         outro. */
      ir: () =>
        irParaLancamentos({
          natureza: NATUREZA_SAIDA,
          vencendo: String(DIAS_DO_A_PAGAR),
        }),
    },
    {
      rotulo: "Saldo das contas",
      valor: resumo?.saldo_das_contas_centavos ?? 0,
      texto: resumo?.tem_conta_cadastrada
        ? `R$ ${formatarCentavos(resumo?.saldo_das_contas_centavos ?? 0)}`
        /* ⚠️ Zero de "não tem conta" se lê igual a zero de "está zerado". A
           frase diz qual dos dois é, e o clique leva para onde se resolve. */
        : "Nenhuma conta",
      /* Sem `tom`: saldo não é alarme. O vermelho de conta negativa é da
         tela do Financeiro, que tem espaço para explicá-lo. */
      ir: () => navegar("/financeiro?aba=configuracoes&secao=contas"),
    },
  ];

  const panorama: NumeroDoResumo[] = [
    {
      rotulo: "Processos monitorados",
      valor: resumo?.processos_total ?? 0,
      ir: () => navegar("/processos"),
    },
    {
      rotulo: "Atendimentos em andamento",
      valor: resumo?.atendimentos_em_andamento ?? 0,
      // O mesmo recorte da contagem: `status == "Em andamento"`, nos
      // subgrupos visíveis (que é o padrão da tela, sem filtro de subgrupo).
      ir: () => navegar("/atendimentos", { state: { status: STATUS_EM_ANDAMENTO } }),
    },
    {
      rotulo: `Movimentações (${DIAS_DA_JANELA_RECENTE} dias)`,
      valor: resumo?.movimentacoes_7_dias ?? 0,
      /* ⚠️ `dias` junto com o tipo, e o mesmo número que está no rótulo.
         Antes ia só o tipo: o card dizia 3 e a lista abria 4, porque a
         movimentação de 30 dias atrás vinha junto. */
      ir: () =>
        navegar("/historico", {
          state: { tipoEnvio: TIPO_ENVIO_MOVIMENTACAO, dias: DIAS_DA_JANELA_RECENTE },
        }),
    },
  ];

  return (
    <Cartao titulo="Resumo rápido">
      {falhou ? (
        <EstadoDeErro
          mensagem="Não foi possível carregar o resumo."
          onTentarDeNovo={() => onTentarDeNovo?.()}
          tentando={tentando}
        />
      ) : carregando ? (
        <Esqueleto linhas={3} />
      ) : (
        <>
          <GrupoDeNumeros rotulo="Precisa de atenção" numeros={atencao} primeiro />
          {/* Entre "atenção" e "panorama": dinheiro atrasado pede ação, mas
              não é prazo processual -- e o saldo é contexto. A seção fica no
              meio porque é isso que ela é. */}
          {temFinanceiro && <GrupoDeNumeros rotulo="Financeiro" numeros={financeiro} />}
          <GrupoDeNumeros rotulo="Panorama" numeros={panorama} />
        </>
      )}
    </Cartao>
  );
}
