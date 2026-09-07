import { useSearchParams } from "react-router-dom";

import {
  Abas,
  CabecalhoDePagina,
  PainelDaAba,
} from "../../components";
import { PARAM_DA_ABA, abaValida } from "../../utils/abas";
import AindaNaoChegou from "./components/AindaNaoChegou";
import ConfiguracoesFinanceiras from "./components/ConfiguracoesFinanceiras";
import { ABAS_DO_FINANCEIRO, GRUPO_DE_ABAS } from "./constants";
import type { AbaDoFinanceiro } from "./types";

/** O dinheiro do escritório: o que entrou, o que saiu, o que se cobra e o
 * caixa.
 *
 * ⚠️ A aba vai para a URL, ao contrário de `GrupoPage`, que está no menu e
 * usa estado local. Não é exceção à regra: o critério de `utils/abas` é ser
 * alcançada por LINK, e a Área de trabalho abre esta tela já filtrada ("A
 * receber atrasado" leva à lista daquele recorte).
 *
 * ⚠️ O conteúdo é CONDICIONAL, como em `GrupoPage`: cada aba tem consultas
 * próprias, e montar as quatro de uma vez dispararia todas juntas. O painel
 * existe para o `aria-controls` da aba ter onde apontar.
 *
 * ➡️ `index.test.tsx`.
 */
export default function FinanceiroPage() {
  const [params, setParams] = useSearchParams();
  const abaAtiva = abaValida(ABAS_DO_FINANCEIRO, params.get(PARAM_DA_ABA));

  /** 🔴 Trocar de aba LIMPA o estado da lista.
   *
   * As quatro abas dividem UM endereço, e as listagens guardam página,
   * tamanho e busca com as mesmas chaves em toda tela. Sem esta limpeza, ir
   * para a página 3 de Lançamentos e trocar para Faturas abriria Faturas na
   * página 3 -- provavelmente vazia, sem nada na tela explicando por quê. */
  function mudarAba(nova: AbaDoFinanceiro) {
    const proximos = new URLSearchParams(params);
    proximos.set(PARAM_DA_ABA, nova);
    for (const chave of ["pagina", "tamanho", "busca"]) proximos.delete(chave);
    setParams(proximos, { replace: true });
  }

  return (
    <>
      <CabecalhoDePagina
        titulo="Financeiro"
        subtitulo="Honorários, entradas, saídas e o caixa do escritório."
      />

      <Abas
        grupo={GRUPO_DE_ABAS}
        abas={ABAS_DO_FINANCEIRO.map((a) => ({ id: a.id, rotulo: a.rotulo }))}
        ativa={abaAtiva}
        onMudar={mudarAba}
      />

      {/* 🔴 Um painel por aba, cada um dizendo o que mostra -- o molde de
          `GrupoPage`. Antes havia uma regra ("não é pendente, então é
          Configurações"), e ela funcionava enquanto Configurações era a
          única pronta: no dia em que Lançamentos deixou de ser pendente, a
          aba passou a mostrar a tela de Configurações inteira. Aqui a
          escolha está escrita, e não deduzida. */}
      <PainelDaAba grupo={GRUPO_DE_ABAS} id="lancamentos" ativa={abaAtiva}>
        {abaAtiva === "lancamentos" && <AindaNaoChegou rotulo="Lançamentos" />}
      </PainelDaAba>
      <PainelDaAba grupo={GRUPO_DE_ABAS} id="faturas" ativa={abaAtiva}>
        {abaAtiva === "faturas" && <AindaNaoChegou rotulo="Faturas" />}
      </PainelDaAba>
      <PainelDaAba grupo={GRUPO_DE_ABAS} id="fluxo" ativa={abaAtiva}>
        {abaAtiva === "fluxo" && <AindaNaoChegou rotulo="Fluxo de caixa" />}
      </PainelDaAba>
      <PainelDaAba grupo={GRUPO_DE_ABAS} id="configuracoes" ativa={abaAtiva}>
        {abaAtiva === "configuracoes" && <ConfiguracoesFinanceiras />}
      </PainelDaAba>
    </>
  );
}
