import type { SubAbaConfig } from "../types";

/** Sub-abas da tela de Grupo, na ordem do artifact.
 *
 * `minimo` é o papel a partir do qual a aba APARECE, e espelha o piso da
 * rota que ela usa -- não é a permissão em si, que continua sendo do
 * servidor.
 */
export const ABAS_DO_GRUPO: SubAbaConfig[] = [
  // `manager`, e não `user`: a rota /grupo inteira passou a exigir
  // `manager` (22/08), então um piso menor aqui seria configuração morta --
  // e sugeriria um acesso que não existe mais.
  { id: "subgrupos", label: "Subgrupos", minimo: "manager" },
  { id: "membros", label: "Membros", minimo: "manager" },
  // `admin`, não `super_admin`: o catálogo de Fase/Situação passou a ser por
  // grupo, e o piso das rotas (POST/PATCH/DELETE /fases e /situacoes) desceu
  // pra `admin`. Enquanto estas duas linhas ficaram em `super_admin`, um
  // `admin` tinha a permissão no servidor e não via as abas -- funcionalidade
  // entregue e invisível, sem 403 pra denunciar.
  { id: "fases", label: "Fases", minimo: "admin" },
  { id: "situacoes", label: "Situações", minimo: "admin" },
  { id: "convidar", label: "Convidar", minimo: "admin" },
  // `admin`, espelhando o piso de GET/PATCH /grupos/configuracoes -- a mesma
  // rota que "Configurações" usa.
  //
  // ⚠️ Aba PRÓPRIA, e não uma seção dentro de Configurações: aquela é um
  // formulário de dois campos com um "Salvar" só, e esta é uma lista de até 50
  // linhas em que cada mexida grava sozinha. É a forma de Fases e Situações --
  // catálogo do escritório é aba.
  { id: "inscricoes", label: "Inscrições na OAB", minimo: "admin" },
  { id: "configuracoes", label: "Configurações", minimo: "admin" },
];
