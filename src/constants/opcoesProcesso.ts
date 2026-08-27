import type { TipoOpcaoProcesso } from "../types";

/** O caminho de cada tipo de opção de processo.
 *
 * ⚠️ Aqui, e não em `services/api/`: é um mapa de constantes, e ali só
 * entram as funções que chamam a API. */
export const CAMINHO_POR_TIPO_DE_OPCAO: Record<TipoOpcaoProcesso, string> = { fase: "/fases", situacao: "/situacoes" };
