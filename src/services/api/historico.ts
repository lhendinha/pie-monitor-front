import { chamar } from "./client";

interface OpcoesListarHistorico {
  numeroProcesso?: string;
  /** "movimentacao" ou "lembrete". Vazio traz os dois. */
  tipoEnvio?: string;
  /** Só os envios que falharam. Cruza os DOIS tipos -- falha de lembrete é
   * falha igual. */
  apenasComFalha?: boolean;
  /** Recorta pelos últimos N dias. `0`/ausente = sem recorte.
   *
   * ⚠️ Manda DIAS, não uma data. Quem converte pra instante é o servidor,
   * com a mesma função que o resumo usa -- mandar data daqui abriria espaço
   * pra um dia de Brasília ser comparado com um instante em UTC, que é a
   * fresta de 3h que a API acabou de fechar. */
  dias?: number;
  pagina?: number;
  tamanhoPagina?: number;
}

/** GET /historico -- depende de contexto de grupo (resolvido no backend
 * pelo próprio token) e pagina de verdade, igual /processos. */
export function listarHistorico(opcoes: OpcoesListarHistorico = {}) {
  const { numeroProcesso, tipoEnvio, apenasComFalha, dias, pagina, tamanhoPagina } = opcoes;
  /* ⚠️ Com `numeroProcesso` vai SÓ ele. O servidor ignora os outros nesse
     ramo (partição própria, sem paginação, feito pro link do e-mail), e
     mandá-los daria a impressão de filtro aplicado. */
  const query: Record<string, string | undefined> = numeroProcesso
    ? { numero_processo: numeroProcesso }
    : {
        pagina: pagina ? String(pagina) : undefined,
        tamanho_pagina: tamanhoPagina ? String(tamanhoPagina) : undefined,
        tipo_envio: tipoEnvio || undefined,
        // Mesmo formato de `sem_responsavel` em /tarefas: string "true", e
        // `undefined` some da query string.
        apenas_com_falha: apenasComFalha ? "true" : undefined,
        dias: dias ? String(dias) : undefined,
      };
  return chamar("/historico", { query });
}
