import type { CamposOpcionaisProcesso } from "../types";

/* 🔴 Mora em `utils/`, e não em `services/api/processos.ts`: é montagem
   de corpo de requisição, não chamada de API. Gêmeo de `corpoDoEndereco`
   em `utils/endereco.ts`. */
export function corpoDosCamposDeProcesso(campos: CamposOpcionaisProcesso = {}) {
  return {
    cliente_ids: campos.clienteIds || [],
    // Sempre presente. O servidor resolve o vazio (vira quem está criando,
    // SE for membro do subgrupo) -- ver `responsaveis_na_criacao`.
    responsaveis: campos.responsaveis || [],
    objeto_assunto: campos.objetoAssunto || "",
    proxima_providencia: campos.proximaProvidencia || "",
    data_verificar: campos.dataVerificar || "",
    prazo_final: campos.prazoFinal || "",
    observacoes: campos.observacoes || "",
    fase_id: campos.faseId || "",
    situacao_id: campos.situacaoId || "",
  };
}
