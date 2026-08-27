import type { EnderecoDoCliente } from "../types";

/** As 27 unidades federativas, na ordem em que aparecem no seletor.
 *
 * 🔴 ESPELHADA no servidor (`api/src/shared/validacao.py`, `UFS`), e não há
 * canal pra buscá-la: `GET /configuracoes` é `admin` e é configuração do
 * grupo, não catálogo. Divergir daqui faz o seletor oferecer uma sigla que
 * o servidor recusa -- 422 na cara de quem só escolheu numa lista.
 *
 * É o mesmo arranjo de `PRIMEIRA_PAGINA_DE_OPCOES` e
 * `TAMANHO_MAXIMO_DO_NOME_DE_CLIENTE`: gêmeo à mão, com o comentário
 * apontando o outro lado. Conjunto fechado desde 1988, então espelhar custa
 * menos que uma rota.
 *
 * ⚠️ Em ordem ALFABÉTICA, que é como se procura uma sigla numa lista de 27
 * -- não por região nem por população.
 */
export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
] as const;

/** Quantos dígitos um CEP tem. É o gatilho da consulta: com menos que isto,
 * não se pergunta nada a ninguém.
 *
 * 🔴 É o que substitui um debounce. Quem digita "30130010" passa por sete
 * valores incompletos, e todos têm menos de 8 dígitos -- esta guarda os
 * elimina sozinha, sem timer. Um debounce não evitaria consulta nenhuma:
 * só atrasaria a única que importa. */
export const DIGITOS_DO_CEP = 8;

/** Um endereço em branco, para semear formulário de cadastro.
 *
 * ⚠️ Todos os campos como `""`, nunca `undefined`: um `<input>` controlado
 * que recebe `undefined` vira NÃO-controlado, e o React só reclama disso no
 * console -- a tela some com o que a pessoa digitou sem avisar.
 *
 * 🔴 Compartilhado porque as DUAS telas de cliente precisam dele (cadastro
 * parte daqui; edição parte do que veio da API, com `?? ""` campo a campo).
 * Duas cópias de sete campos divergem no primeiro ajuste.
 */
export const ENDERECO_VAZIO: EnderecoDoCliente = {
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
};
