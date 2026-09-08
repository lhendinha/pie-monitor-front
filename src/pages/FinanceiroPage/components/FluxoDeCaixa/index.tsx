import { Flex } from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import {
  Botao,
  CartaoDeTabela,
  Esqueleto,
  EstadoDeErro,
  EstadoVazio,
  Faixa,
  IconeBaixar,
  PilulaDeFiltro,
  Select,
  SeletorDePeriodo,
} from "../../../../components";
import {
  PERIODOS_DO_FLUXO,
  PERIODO_PADRAO_DO_FLUXO,
  PERIODO_PERSONALIZADO,
} from "../../../../constants";
import { useEstadoNaUrl } from "../../../../hooks/useEstadoNaUrl";
import { useParametrosDaUrl } from "../../../../hooks/useParametrosDaUrl";
import { lerCatalogoFinanceiro, lerFluxoDeCaixa } from "../../../../services";
import { useToastOnQueryError } from "../../../../services/queryClient";
import { qk } from "../../../../services/queryKeys";
import {
  baixarCsv,
  erroDoPeriodoEmMeses,
  intervaloEmMeses,
  mesDeHoje,
  opcoesDeCentro,
  opcoesDeConta,
} from "../../../../utils";
import type { CatalogoFinanceiro, FluxoDeCaixa as Fluxo } from "../../../../types";
import TabelaDoFluxo from "./TabelaDoFluxo";
import { montarPlanilhaDoFluxo, nomeDoArquivoDoFluxo } from "./planilhaDoFluxo";

/** A aba de Fluxo de caixa: o que entrou e o que saiu, mês a mês.
 *
 * 🔴 **O período é em MESES**, e por isso a pílula tem opções próprias: a
 * tabela tem uma coluna por mês, e "Hoje" ou "Últimos 7 dias" virariam uma
 * coluna só -- um relatório de fluxo com uma coluna não responde a pergunta
 * que ele existe para responder.
 *
 * 🔴 **A tela recusa o período inválido ANTES de pedir.** As duas regras
 * (fim antes do início, mais de 24 meses) são as do servidor; ir buscar um
 * 400 para descobrir o que a tela já sabe transforma uma correção numa
 * mensagem de "Não foi possível carregar".
 *
 * ⚠️ **Centro e conta somem o saldo.** O saldo é da CONTA: com um centro de
 * custo filtrado o servidor manda `saldo_disponivel: false` e a tabela
 * esconde as três linhas, em vez de mostrar um número que não existe em
 * extrato nenhum. A faixa explica.
 *
 * ⚠️ O período e os filtros vão para a URL: este relatório é o tipo de tela
 * que se manda por link para o contador.
 *
 * ➡️ `index.test.tsx`.
 */
export default function FluxoDeCaixa() {
  const [periodoId] = useEstadoNaUrl("periodo", PERIODO_PADRAO_DO_FLUXO);
  const [de] = useEstadoNaUrl("de", "");
  const [ate] = useEstadoNaUrl("ate", "");
  /* 🔴 O período escreve TRÊS chaves (`periodo`, `de`, `ate`) num gesto só,
     e por isso vai pelo mecanismo de vários de uma vez.
     Medido: com três `useEstadoNaUrl` em sequência, cada `setSearchParams`
     navega na hora a partir da MESMA URL, e o último apagava o `periodo` --
     escolher "Últimos 6 meses" não mudava nada. É a armadilha que o
     docstring de `useParametrosDaUrl` já descreve. */
  const { atualizar } = useParametrosDaUrl();
  const [centroId, setCentroId] = useEstadoNaUrl("centro", "");
  const [contaId, setContaId] = useEstadoNaUrl("conta", "");
  /* ⚠️ Estado local, e não na URL: dobrar uma seção é gesto de leitura, não
     recorte de dado -- não muda o que a tela mostra, muda o que cabe nela. */
  const [dobrados, setDobrados] = useState<string[]>([]);

  const personalizado = de && ate ? { de, ate } : undefined;
  const intervalo = intervaloEmMeses(periodoId, personalizado);
  const erroDoPeriodo = erroDoPeriodoEmMeses(intervalo);
  /** O nome do recorte, para a legenda do topo da tabela. Cai no
   * personalizado quando o id não está nos blocos -- é o mesmo caminho que a
   * pílula usa para não mostrar "Todos os períodos" com período escolhido. */
  const rotuloDoPeriodo =
    PERIODOS_DO_FLUXO.flat().find((o) => o.id === periodoId)?.rotulo ?? "Período escolhido";

  const filtros = {
    de: intervalo?.de,
    ate: intervalo?.ate,
    centro_id: centroId || undefined,
    conta_id: contaId || undefined,
  };

  const query = useQuery<Fluxo>({
    queryKey: qk.fluxoDeCaixa(filtros),
    queryFn: () => lerFluxoDeCaixa(filtros) as Promise<Fluxo>,
    /* Um período que a tela já sabe inválido não vira requisição. */
    enabled: !erroDoPeriodo,
    placeholderData: (anterior) => anterior,
  });
  useToastOnQueryError(query.error, "Não foi possível carregar o fluxo de caixa.");

  const catalogo = useQuery<CatalogoFinanceiro>({
    queryKey: qk.catalogoFinanceiro(),
    queryFn: lerCatalogoFinanceiro,
  });

  function mudarPeriodo(novo: string, escolhido?: { de: string; ate: string }) {
    const personalizadoNovo = novo === PERIODO_PERSONALIZADO;
    atualizar(
      {
        periodo: novo,
        ...(personalizadoNovo
          ? { de: escolhido?.de ?? "", ate: escolhido?.ate ?? "" }
          : {}),
      },
      /* ⚠️ Sair do personalizado APAGA as pontas: deixá-las na URL faria um
         link compartilhado carregar um recorte que a pílula não mostra. */
      personalizadoNovo ? undefined : { tambemApaga: ["de", "ate"] },
    );
  }

  function alternar(natureza: string) {
    setDobrados((atuais) =>
      atuais.includes(natureza)
        ? atuais.filter((n) => n !== natureza)
        : [...atuais, natureza],
    );
  }

  const fluxo = query.data;
  const vazio = fluxo && fluxo.linhas.length === 0;

  return (
    <>
      <Flex align="center" gap="8px" wrap="wrap" mb="12px">
        <SeletorDePeriodo
          periodoId={periodoId}
          intervaloPersonalizado={personalizado}
          blocos={PERIODOS_DO_FLUXO}
          emMeses
          onMudar={mudarPeriodo}
        />
        {/* ⚠️ Centro ANTES de conta, como no artefato: o centro é o recorte
            que muda o que a tabela mostra (e some o saldo); a conta é um
            filtro comum. */}
        <Select
          id="fluxo-centro"
          opcoes={[
            { value: "", label: "Todos os centros de custo" },
            ...opcoesDeCentro(catalogo.data).filter((o) => o.value),
          ]}
          valor={centroId}
          onMudar={setCentroId}
          variante="chip"
        />
        <Select
          id="fluxo-conta"
          opcoes={[{ value: "", label: "Todas as contas" }, ...opcoesDeConta(catalogo.data)]}
          valor={contaId}
          onMudar={setContaId}
          variante="chip"
        />
        {(centroId || contaId) && (
          <PilulaDeFiltro
            ativo
            onClick={() => {
              setCentroId("");
              setContaId("");
            }}
          >
            Limpar filtros
          </PilulaDeFiltro>
        )}
        <Flex ml="auto">
          <Botao
            variante="ghost"
            disabled={!fluxo || vazio}
            onClick={() =>
              fluxo && baixarCsv(nomeDoArquivoDoFluxo(fluxo.meses), montarPlanilhaDoFluxo(fluxo))
            }
          >
            <IconeBaixar />
            Exportar planilha
          </Botao>
        </Flex>
      </Flex>

      {erroDoPeriodo && (
        <Faixa tom="aviso" aEsquerda>{erroDoPeriodo}</Faixa>
      )}

      {!erroDoPeriodo && fluxo && !fluxo.saldo_disponivel && (
        <Faixa tom="aviso" aEsquerda>
          O saldo é da CONTA, e não do recorte: com centro de custo filtrado
          ele não é mostrado, porque não há como atribuir parte de um extrato
          a um centro.
        </Faixa>
      )}

      {query.isPending && !erroDoPeriodo ? (
        <Esqueleto linhas={6} />
      ) : query.isError ? (
        <CartaoDeTabela>
          <EstadoDeErro
            mensagem="Não foi possível carregar o fluxo de caixa."
            onTentarDeNovo={() => query.refetch()}
            tentando={query.isFetching}
          />
        </CartaoDeTabela>
      ) : fluxo && !erroDoPeriodo ? (
        <>
          {/* ⚠️ Sem a contagem de meses acima do cartão: a legenda dentro
              dele já diz o período e o que é realizado -- duas linhas para a
              mesma informação, uma em cima da outra. */}
          <CartaoDeTabela>
            {vazio ? (
              <EstadoVazio mensagem="Nenhum lançamento neste período." />
            ) : (
              <TabelaDoFluxo
                fluxo={fluxo}
                mesCorrente={mesDeHoje()}
                rotuloDoPeriodo={rotuloDoPeriodo}
                dobrados={dobrados}
                onAlternar={alternar}
              />
            )}
          </CartaoDeTabela>
        </>
      ) : null}
    </>
  );
}
