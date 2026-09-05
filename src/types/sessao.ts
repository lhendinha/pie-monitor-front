/** Quem entra e com que papel: tokens, perfil e as abas que o perfil enxerga. */

export type Papel = "user" | "manager" | "admin" | "super_admin";

/** O corpo de `PATCH /me`, montado campo a campo.
 *
 * 🔴 **Todo campo é opcional porque AUSENTE significa "não mexer".** Mandar
 * `undefined` vira campo ausente no JSON; mandar o valor vazio APAGA. São
 * coisas diferentes, e o tipo as separa em vez de deixar por conta de quem
 * chama.
 *
 * ⚠️ `inscricao` com as duas partes vazias LIMPA a OAB -- é o único jeito de
 * apagar uma cadastrada por engano.
 *
 * ⚠️ **`importacao` leva os dois juntos**, e não são dois campos soltos: o
 * servidor recusa ligar sem destino, então mandar um sem o outro só produz
 * erro. Ligar sem inscrição também é recusado. */
export interface CamposDoMeuPerfil {
  apelido?: string;
  inscricao?: { numero: string; uf: string };
  importacao?: { ligada: boolean; subgruposDestino: string[] };
}

/** Um subgrupo de que a própria pessoa participa, como `GET /me` o devolve.
 *
 * 🔴 **Vem com `nome`, e não só `id`**: seletor de identificador não é
 * seletor. Resolver id→nome aqui exigiria uma segunda consulta ao que o
 * servidor já tinha na mão.
 *
 * ⚠️ A lista já chega FILTRADA pelo servidor -- são os subgrupos de que a
 * pessoa é membro, não os que ela pode ver. Um `admin` vê todos, e mesmo
 * assim só pode mandar a própria importação para os que frequenta. */
export interface SubgrupoDoPerfil {
  id: string;
  nome: string;
}

/** O que `GET /me` devolve.
 *
 * 🔴 A lista de campos é FECHADA do lado do servidor (`CAMPOS_DO_MEU_PERFIL`),
 * e é ela que impede material de credencial de sair. Acrescentar aqui sem
 * acrescentar lá dá `undefined` em silêncio.
 *
 * ⚠️ `numero_oab`/`uf_oab` vêm `null` -- nunca ausentes -- quando não há
 * inscrição: a tela pergunta "tem OAB?", não "o campo veio?". */
export interface MeuPerfil {
  email: string;
  apelido: string | null;
  papel: Papel;
  numero_oab: string | null;
  uf_oab: string | null;
  /** O interruptor da importação automática da inscrição desta pessoa.
   *
   * 🔴 **É sobre CRIAR, não sobre VIGIAR.** Com a inscrição cadastrada o
   * sistema já acompanha as movimentações; ligado, ele passa a CADASTRAR os
   * processos novos que o tribunal devolver. */
  importacao_automatica: boolean;
  /** Para onde os processos criados vão. Vazio quando o interruptor está
   * desligado -- o servidor zera, e a tela não deve reconstruir. */
  subgrupos_destino: string[];
  subgrupos: SubgrupoDoPerfil[];
}

export interface TokensResponse {
  access_token: string;
  refresh_token: string;
  expira_em: number;
  email: string;
  apelido?: string | null;
}

export interface JwtPayload {
  email?: string;
  grupo_id?: string | null;
  papel?: Papel;
  type?: string;
  jti?: string;
  iat?: number;
  exp?: number;
}

/** Query string opcional + corpo opcional, usados nas chamadas de api.ts */
export interface OpcoesRequisicao {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: Record<string, unknown>;
  /** Array vira parâmetro repetido (`?fase_id=a&fase_id=b`), que é como o
   * FastAPI lê lista. Ver `montarQuery` em services/api/client.ts. */
  query?: Record<string, string | string[] | undefined>;
}

/** As abas de PerfilPage -- o par de `SubAbaId`, que responde a mesma
 * pergunta para a tela de Grupo. */
export type AbaDoPerfil = "dados" | "inscricao";

/** Sub-abas dentro de GrupoPage. */
export type SubAbaId =
  | "subgrupos"
  | "membros"
  | "convidar"
  | "fases"
  | "situacoes"
  | "inscricoes"
  | "configuracoes";

export interface SubAbaConfig {
  id: SubAbaId;
  label: string;
  minimo: Papel;
}
