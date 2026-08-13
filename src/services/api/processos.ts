import { chamar, comGrupoAlvo } from "./client";

export function listarProcessos(grupoIdAlvo?: string) {
  return chamar("/processos", comGrupoAlvo({}, grupoIdAlvo));
}

export function criarProcesso(
  subgrupoId: string,
  numeroProcesso: string,
  apelido: string,
  grupoIdAlvo?: string
) {
  return chamar(
    `/subgrupos/${subgrupoId}/processos`,
    comGrupoAlvo({ method: "POST", body: { numero_processo: numeroProcesso, apelido } }, grupoIdAlvo)
  );
}

export function removerProcesso(subgrupoId: string, numeroProcesso: string, grupoIdAlvo?: string) {
  return chamar(
    `/subgrupos/${subgrupoId}/processos/${numeroProcesso}`,
    comGrupoAlvo({ method: "DELETE" }, grupoIdAlvo)
  );
}

export function detalhesProcesso(numeroProcesso: string, grupoIdAlvo?: string) {
  return chamar(`/processos/${numeroProcesso}/detalhes`, comGrupoAlvo({}, grupoIdAlvo));
}
