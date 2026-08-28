import { useEstadoNaUrl } from "./useEstadoNaUrl";
import { TAMANHOS_PAGINA, TAMANHO_PAGINA_PADRAO } from "../constants";

/** A paginação de uma listagem, lida da URL -- página e tamanho juntos.
 *
 * 🔴 As sete telas paginadas declaravam as duas chaves à mão, com o
 * `tambemApaga` repetido em cada uma. Repetição de regra é regra que diverge:
 * bastava uma tela esquecer o `tambemApaga` para trocar o tamanho de página
 * mantendo a página 4 e mostrar lista vazia.
 *
 * ⚠️ **O tamanho é validado contra as opções que o seletor oferece.** A URL é
 * editável à mão: medido, `?tamanho=9999` batia no teto do servidor (`le=100`)
 * e a tela dizia *"Não foi possível carregar os processos"* -- um 422 lido
 * como falha do sistema. Fora da lista, cai no padrão.
 *
 * ⚠️ A página é validada aqui pelo mesmo motivo: o codec só garante que é
 * INTEIRO -- a faixa é de quem declara. Medido, `?pagina=-3` batia no `ge=1`
 * do servidor e a tela dizia "Não foi possível carregar os processos".
 */
export function usePaginacaoDaLista() {
  const [paginaCrua, setPagina] = useEstadoNaUrl("pagina", 1);
  const pagina = paginaCrua >= 1 ? paginaCrua : 1;
  const [tamanhoCru, setTamanhoPagina] = useEstadoNaUrl(
    "tamanho",
    TAMANHO_PAGINA_PADRAO,
    /* Trocar o tamanho volta para a primeira página: a 4ª de 10 em 10 não
       existe de 30 em 30, e o servidor devolveria vazio. */
    { tambemApaga: ["pagina"] },
  );

  const tamanhoPagina = (TAMANHOS_PAGINA as readonly number[]).includes(tamanhoCru)
    ? tamanhoCru
    : TAMANHO_PAGINA_PADRAO;

  return { pagina, setPagina, tamanhoPagina, setTamanhoPagina };
}
