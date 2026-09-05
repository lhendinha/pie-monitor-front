import { useNavigate } from "react-router-dom";

import { Cartao, EstadoDeErro, Esqueleto } from "../../../../components";
import { emDias, hojeISO } from "../../../../utils";
/* ⚠️ Os dois únicos imports de constante ENTRE páginas do projeto, e é
   deliberado. A regra da casa é "específico da página mora dentro dela" --
   mas este cartão navega PARA aquelas telas, e o clique tem que aplicar
   exatamente o filtro que o número contou.
   A alternativa seria repetir `"Em andamento"` e o `7` aqui, e aí o rótulo
   do card e o filtro do destino divergiriam no primeiro ajuste -- que é o
   defeito que esta rodada inteira existiu pra tirar. Coupling explícito e
   com uma fonte só é melhor que dois literais concordando por sorte. */
import { STATUS_EM_ANDAMENTO } from "../../../AtendimentosPage/constants";
import { RESPONSAVEL_EU } from "../../../ProcessosPage/constants";
import { DIAS_DA_JANELA_RECENTE } from "../../../HistoricoPage/constants";
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
   * 🔴 O servidor conta OS MEUS nesses dois números desde 26/08/2026 (a
   * régua "eu seria avisado", que inclui os órfãos). Sem o filtro no clique,
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
      /* 🔴 Este número passou um tempo SEM link, e não por falta de tela.
         "Atrasadas" é `data < hoje` em QUALQUER dia passado, e toda visão da
         Agenda é limitada por janela de datas -- mandar pra lá levaria a uma
         tela mostrando ZERO das atrasadas. Pior que link nenhum.

         A Agenda ganhou um MODO pra isso (26/08/2026): a pílula "Todos os
         períodos" com a opção "Atrasadas" ignora a janela, trava a visão em
         lista e some com a navegação de datas. Só então o clique passou a
         contar a mesma história que o número. */
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
          state: { tipoEnvio: "movimentacao", dias: DIAS_DA_JANELA_RECENTE },
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
          <GrupoDeNumeros rotulo="Panorama" numeros={panorama} />
        </>
      )}
    </Cartao>
  );
}
