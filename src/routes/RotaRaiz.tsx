import { Navigate, useLocation } from "react-router-dom";

import { parseDeepLinkHistorico, parseProcessoAvulso } from "../utils";

/** A raiz `/` é onde caem os links de e-mail de movimentação, que usam query
 * string em vez de caminho. Ela lê o que veio e manda pra tela certa.
 *
 * Os dois formatos precisam ser atendidos, e são diferentes:
 *
 * - `?processo=X&comunicacao=Y` -> Histórico, abrindo aquela comunicação. É o
 *   formato dos e-mails **já enviados** em produção; quebrar isso quebraria
 *   todo link antigo de uma vez.
 * - `?processo=X` sozinho -> Processos, com o número em destaque. O backend
 *   gera esse quando a API do PJe não devolve o id da comunicação. Antes
 *   desta rota, esse link não fazia absolutamente nada.
 *
 * `replace` nos três casos: a URL com query string não deve ficar no
 * histórico do navegador, senão o Voltar traz a pessoa de volta pro
 * redirecionamento, em laço.
 *
 * ⚠️ Fase 0: sem deep link, `/` vai pra Processos, que é a tela inicial de
 * hoje. Quando a Área de trabalho existir (etapa 2e), ela passa a ser
 * renderizada aqui e este redirecionamento sai.
 */
export default function RotaRaiz() {
  const { search } = useLocation();

  const deepLink = parseDeepLinkHistorico(search);
  if (deepLink) return <Navigate to="/historico" replace state={{ deepLink }} />;

  const processo = parseProcessoAvulso(search);
  if (processo) return <Navigate to="/processos" replace state={{ processoEmDestaque: processo }} />;

  return <Navigate to="/processos" replace />;
}
