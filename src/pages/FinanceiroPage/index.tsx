import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

import {
  Abas,
  CabecalhoDePagina,
  PainelDaAba,
} from "../../components";
import {
  TIPO_ENTRADA,
  TIPO_HONORARIO,
  TIPO_SAIDA,
  TIPO_TRANSFERENCIA,
  NATUREZA_ENTRADA,
  NATUREZA_SAIDA,
} from "../../constants";
import { lerCatalogoFinanceiro } from "../../services";
import { qk } from "../../services/queryKeys";
import { PARAM_DA_ABA, abaValida } from "../../utils/abas";
import type { CatalogoFinanceiro } from "../../types";
import AindaNaoChegou from "./components/AindaNaoChegou";
import ListaDeFaturas from "./components/ListaDeFaturas";
import ListaDeLancamentos from "./components/ListaDeLancamentos";
import MenuDeNovoLancamento from "./components/MenuDeNovoLancamento";
import ModalDeEntradaOuSaida from "./components/ModalDeEntradaOuSaida";
import ModalDeHonorario from "./components/ModalDeHonorario";
import ModalDeTransferencia from "./components/ModalDeTransferencia";
import { useCriarLancamento } from "./hooks/useCriarLancamento";
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
  const novo = useCriarLancamento();

  /* 🔴 O catálogo é lido AQUI, e não dentro de cada modal: os quatro
     precisam das mesmas contas, categorias e centros, e quatro consultas
     iguais na mesma chave só existiriam para o React Query deduplicar de
     novo. A lista de lançamentos já o lê pela mesma chave -- então abrir o
     formulário não custa requisição nenhuma. */
  const catalogo = useQuery<CatalogoFinanceiro>({
    queryKey: qk.catalogoFinanceiro(),
    queryFn: lerCatalogoFinanceiro,
  });

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
        /* ⚠️ No cabeçalho da PÁGINA, acima das abas, como no artefato: o
           botão vale para as quatro, e lançar dinheiro é o que se faz aqui
           -- inclusive vindo de Configurações, onde a pessoa acabou de
           cadastrar a conta que vai usar. */
        acoes={<MenuDeNovoLancamento onEscolher={novo.abrir} />}
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
        {abaAtiva === "lancamentos" && <ListaDeLancamentos />}
      </PainelDaAba>
      <PainelDaAba grupo={GRUPO_DE_ABAS} id="faturas" ativa={abaAtiva}>
        {abaAtiva === "faturas" && <ListaDeFaturas />}
      </PainelDaAba>
      <PainelDaAba grupo={GRUPO_DE_ABAS} id="fluxo" ativa={abaAtiva}>
        {abaAtiva === "fluxo" && <AindaNaoChegou rotulo="Fluxo de caixa" />}
      </PainelDaAba>
      <PainelDaAba grupo={GRUPO_DE_ABAS} id="configuracoes" ativa={abaAtiva}>
        {abaAtiva === "configuracoes" && <ConfiguracoesFinanceiras />}
      </PainelDaAba>

      {/* ⚠️ `key={novo.chave}` é o que faz "Salvar e adicionar outra"
          funcionar: o formulário REMONTA vazio, com uma chave de criação
          nova, em vez de alguém zerar campo por campo e esquecer um. */}
      {novo.forma === TIPO_HONORARIO && (
        <ModalDeHonorario
          key={novo.chave}
          catalogo={catalogo.data}
          salvando={novo.salvando}
          erro={novo.erro}
          onSalvar={(dados, parcelas, continuar) =>
            novo.honorario.mutate({ dados, parcelas, continuar })
          }
          onFechar={novo.fechar}
        />
      )}
      {novo.forma === TIPO_ENTRADA && (
        <ModalDeEntradaOuSaida
          key={novo.chave}
          natureza={NATUREZA_ENTRADA}
          catalogo={catalogo.data}
          salvando={novo.salvando}
          erro={novo.erro}
          onSalvar={(dados, repetir, continuar) =>
            novo.entrada.mutate({ dados, repetir, continuar })
          }
          onTrocarParaHonorario={() => novo.abrir(TIPO_HONORARIO)}
          onFechar={novo.fechar}
        />
      )}
      {novo.forma === TIPO_SAIDA && (
        <ModalDeEntradaOuSaida
          key={novo.chave}
          natureza={NATUREZA_SAIDA}
          catalogo={catalogo.data}
          salvando={novo.salvando}
          erro={novo.erro}
          onSalvar={(dados, repetir, continuar) =>
            novo.saida.mutate({ dados, repetir, continuar })
          }
          onFechar={novo.fechar}
        />
      )}
      {novo.forma === TIPO_TRANSFERENCIA && (
        <ModalDeTransferencia
          key={novo.chave}
          catalogo={catalogo.data}
          salvando={novo.salvando}
          erro={novo.erro}
          onSalvar={(dados, continuar) => novo.transferencia.mutate({ dados, continuar })}
          onFechar={novo.fechar}
        />
      )}
    </>
  );
}
