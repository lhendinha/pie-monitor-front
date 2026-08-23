import { useNavigate } from "react-router-dom";

import { Cartao, EstadoDeErro, Esqueleto } from "../../../../components";
import { emDias, hojeISO } from "../../../../utils";
import GrupoDeNumeros from "../GrupoDeNumeros";
import type { NumeroDoResumo } from "../../types";
import type { ResumoDaAreaDeTrabalho } from "../../../../types";

interface ResumoRapidoProps {
  resumo?: ResumoDaAreaDeTrabalho;
  carregando: boolean;
  /** A consulta falhou.
   *
   * Sem isto, os `?? 0` espalhados aqui transformavam a falha em ZERO:
   * "Tarefas atrasadas: 0", com barra desenhada e tudo. É o número que a
   * pessoa abre o app pra ver, e zero é a resposta que ela mais quer --
   * então a mentira passa sem ser questionada. */
  falhou?: boolean;
  onTentarDeNovo?: () => void;
  tentando?: boolean;
}

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
}: ResumoRapidoProps) {
  const navegar = useNavigate();

  function irParaProcessos(filtros: Record<string, string>) {
    navegar("/processos", { state: { filtros } });
  }

  const atencao: NumeroDoResumo[] = [
    {
      rotulo: "A verificar até hoje",
      valor: resumo?.a_verificar_ate_hoje ?? 0,
      tom: "bad",
      ir: () => irParaProcessos({ dataVerificarAte: hojeISO() }),
    },
    {
      rotulo: "Prazo final em até 7 dias",
      valor: resumo?.prazo_final_em_7_dias ?? 0,
      tom: "warn",
      ir: () => irParaProcessos({ prazoFinalAte: emDias(7) }),
    },
    // Tarefas levam ao Kanban, que ainda não existe.
    { rotulo: "Tarefas atrasadas", valor: resumo?.tarefas_atrasadas ?? 0, tom: "bad" },
    { rotulo: "Tarefas sem responsável", valor: resumo?.tarefas_sem_responsavel ?? 0, tom: "warn" },
    {
      rotulo: "Envios com falha",
      valor: resumo?.envios_com_falha ?? 0,
      tom: "bad",
      // Falha cruza os dois tipos de envio, então o Histórico abre SEM
      // filtro -- filtrado em Movimentações, o número não bateria.
      ir: () => navegar("/historico", { state: { tipoEnvio: "" } }),
    },
  ];

  const panorama: NumeroDoResumo[] = [
    {
      rotulo: "Processos monitorados",
      valor: resumo?.processos_total ?? 0,
      ir: () => navegar("/processos"),
    },
    // Atendimentos ainda não tem tela.
    { rotulo: "Atendimentos em andamento", valor: resumo?.atendimentos_em_andamento ?? 0 },
    {
      rotulo: "Movimentações (7 dias)",
      valor: resumo?.movimentacoes_7_dias ?? 0,
      ir: () => navegar("/historico", { state: { tipoEnvio: "movimentacao" } }),
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
