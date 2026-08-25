import { useEffect, useMemo, useRef, useState } from "react";

import { ESPERA_DA_BUSCA_MS, PRIMEIRA_PAGINA_DE_OPCOES } from "../../constants/busca";
import { useValorComEspera } from "../../hooks/useValorComEspera";
import { contemTermo } from "../../utils/texto";
import type { OpcaoDeSelect } from "../../types";

interface BuscaDoPainel {
  busca: string;
  mudarBusca: (termo: string) => void;
  /** O que o react-select recebe: a lista já filtrada, no caso local; a
   * lista que o pai trouxe, no remoto. */
  opcoesVisiveis: OpcaoDeSelect[];
  /** Quantos casaram com o termo mas não couberam no teto. Zero na imensa
   * maioria das vezes; quando não é, o painel PRECISA dizer. */
  ocultos: number;
}

/** A digitação dentro do painel, nos dois regimes.
 *
 * **Local** (`onBuscar` ausente): a lista inteira já está na tela -- fase e
 * situação vêm com a página e não crescem sem limite. Filtrar aqui é
 * instantâneo e não custa requisição nenhuma.
 *
 * **Remoto** (`onBuscar` presente): cliente, subgrupo e pessoa podem ser
 * milhares. Chega a PRIMEIRA PÁGINA, em ordem alfabética, e quem procura o
 * que não está nela digita. É a regra que passou a valer no sistema todo:
 * *toda lista que pode crescer sem limite carrega a primeira página e se
 * completa por busca.*
 *
 * 🔴 A espera entre teclas não é enfeite. No protótipo, sem ela, cada tecla
 * disparava o trabalho inteiro e a digitação travava de forma visível com
 * 5.000 clientes. `ESPERA_DA_BUSCA_MS` é a mesma dos outros campos de busca
 * do sistema -- uma espera diferente por campo faria a mesma tecla parecer
 * mais lenta numa tela do que na outra.
 *
 * ⚠️ O termo zera quando o painel FECHA. Sem isso, reabrir a pílula
 * mostraria o resultado da busca anterior como se fosse a lista toda -- e no
 * remoto a pessoa concluiria que só existem os três clientes que sobraram
 * do "sil" que ela digitou ontem.
 */
export function useBuscaDoPainel(
  opcoes: OpcaoDeSelect[],
  aberto: boolean,
  onBuscar?: (termo: string) => void,
): BuscaDoPainel {
  const [busca, setBusca] = useState("");
  const comEspera = useValorComEspera(busca.trim(), ESPERA_DA_BUSCA_MS);

  /* ⚠️ Ajuste DURANTE a renderização, não num efeito -- mesmo padrão que
     `ProcessosPage` usa pra voltar à página 1 ao trocar de filtro. Com
     `useEffect`, o termo velho chegaria a ser renderizado uma vez antes de
     ser limpo, e o React documenta esta forma pra estado derivado: comparar
     com o valor anterior e ajustar no corpo do componente. */
  const [abertoAnterior, setAbertoAnterior] = useState(aberto);
  if (abertoAnterior !== aberto) {
    setAbertoAnterior(aberto);
    if (!aberto) setBusca("");
  }

  /* 🔴 Nada é pedido antes da PRIMEIRA abertura. É abrir que dispara a busca,
     e é isso que faz a tela deixar de baixar o catálogo inteiro: sem esta
     guarda o efeito rodaria na montagem e toda tela com uma pílula de cliente
     pediria a lista no carregamento -- exatamente o custo que a mudança
     existe pra tirar. Quem nunca abre o filtro nunca paga por ele. */
  const [jaAbriu, setJaAbriu] = useState(false);
  if (aberto && !jaAbriu) setJaAbriu(true);

  /* ⚠️ O último termo ENVIADO, num ref: os pais passam `onBuscar` como
     função anônima, que muda de identidade a cada render. Sem esta guarda o
     efeito re-dispararia a cada render do pai -- e como buscar muda o estado
     do pai, isso é um laço.

     🔴 FECHAR envia termo vazio, e isso não é detalhe. A versão anterior
     zerava `busca` ao fechar mas não avisava o pai -- então quem buscasse
     "zzz", não achasse nada e fechasse com Esc deixava a lista do PAI
     filtrada pra sempre. Na Agenda isso desabilitava o botão "Nova tarefa":
     a tela passava a achar que não existe subgrupo nenhum. Reproduzido em
     Chrome. */
  const ultimoEnviado = useRef<string | null>(null);
  useEffect(() => {
    if (!onBuscar || !jaAbriu) return;
    const alvo = aberto ? comEspera : "";
    if (ultimoEnviado.current === alvo) return;
    ultimoEnviado.current = alvo;
    onBuscar(alvo);
  }, [comEspera, aberto, jaAbriu, onBuscar]);

  const filtradas = useMemo(
    /* No remoto quem filtrou foi o servidor: filtrar de novo aqui
       esconderia resultados que ele considerou válidos por outro critério
       (o CNPJ do cliente, por exemplo, que não aparece no rótulo). */
    () => (onBuscar ? opcoes : opcoes.filter((o) => contemTermo(o.label, busca))),
    [opcoes, busca, onBuscar],
  );

  /** 🔴 Teto no que vai pra TELA, e a razão é medida, não estimada.
   *
   * O react-select desenha uma linha de DOM por opção, sem virtualização.
   * Com 5.000 opções casando com o termo, cada tecla custava 170ms em Chrome
   * (contra 22ms na pílula de cliente, que o servidor já corta em 50) -- é o
   * mesmo travamento que apareceu no protótipo e pela mesma causa.
   *
   * ⚠️ O teto é o mesmo `PRIMEIRA_PAGINA_DE_OPCOES` da busca no servidor. Não
   * por elegância: as duas pílulas ficam lado a lado na mesma barra, e cortar
   * em números diferentes faria uma lista parecer mais completa que a outra
   * sem nenhuma razão que a pessoa pudesse perceber.
   *
   * ⚠️ E o corte é DITO (ver `ExtrasDoMenu.ocultos`). Lista truncada em
   * silêncio se lê como lista inteira -- quem procura a situação que ficou
   * na posição 51 conclui que ela não existe. */
  const opcoesVisiveis = useMemo(
    () => (filtradas.length > PRIMEIRA_PAGINA_DE_OPCOES ? filtradas.slice(0, PRIMEIRA_PAGINA_DE_OPCOES) : filtradas),
    [filtradas],
  );

  return {
    busca,
    mudarBusca: setBusca,
    opcoesVisiveis,
    ocultos: filtradas.length - opcoesVisiveis.length,
  };
}
