import { Flex } from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

import { PilulaDeFiltro, SeletorDePeriodo } from "../../../../components";
import { PERIODOS_DE_DINHEIRO } from "../../../../constants";
import { useClientesBuscaveis } from "../../../../hooks/useClientesBuscaveis";
import { useEstadoNaUrl } from "../../../../hooks/useEstadoNaUrl";
import { usePaginacaoDaLista } from "../../../../hooks/usePaginacaoDaLista";
import { listarAFaturar, listarFaturas } from "../../../../services";
import { qk } from "../../../../services/queryKeys";
import { intervaloDoPeriodo } from "../../../../utils";
import { SECOES_DE_FATURAS } from "../../constants";
import ModalDeEmissao from "../ModalDeEmissao";
import SecaoAFaturar from "../SecaoAFaturar";
import SecaoEmitidas from "../SecaoEmitidas";
import type { SecaoDeFaturas } from "../../types";
import type { ClienteAFaturar } from "../../../../types";
import type { RespostaAFaturar, RespostaDeFaturas } from "../../../../types/respostas";

/** A aba de Faturas: o que há para cobrar, e o que já foi cobrado.
 *
 * 🔴 **"A faturar" NÃO é uma lista de faturas** -- é uma lista de CLIENTES
 * com dinheiro esperando cobrança, agrupada pelo servidor. Clicar num
 * cliente abre a emissão dele, e é o único caminho para criar uma fatura:
 * fatura sem cliente não existe.
 *
 * ⚠️ **A pílula de período só aparece em "Emitidas".** Em "A faturar" ela
 * não teria sentido -- aquilo é "o que está aberto HOJE", não um recorte de
 * tempo --, e uma pílula que não filtra nada engana.
 *
 * ⚠️ **Cada seção carrega a SUA consulta.** As duas juntas seriam duas
 * requisições para mostrar uma tela só, e a de "a faturar" lê a partição
 * inteira do lado de lá.
 *
 * ⚠️ **Só "Emitidas" é paginada**, e é a mesma assimetria da pílula de
 * período: "a faturar" é o que está aberto HOJE, e encolhe conforme se
 * cobra; "emitidas" nunca perde uma linha, porque paga e cancelada ficam.
 *
 * ➡️ `index.test.tsx`.
 */
export default function ListaDeFaturas() {
  const navegar = useNavigate();
  const [secao, setSecao] = useEstadoNaUrl<SecaoDeFaturas>("secao", "a-faturar");
  /* ⚠️ Trocar o período volta para a primeira página: a 4ª de "todos" quase
     nunca existe em "este mês", e o servidor devolveria vazio. É a mesma
     régua que `usePaginacaoDaLista` aplica ao tamanho. */
  const [periodoId, setPeriodoId] = useEstadoNaUrl("periodo", "todos", {
    tambemApaga: ["pagina"],
  });
  const { pagina, setPagina, tamanhoPagina, setTamanhoPagina } = usePaginacaoDaLista();
  const [clienteNoModal, setClienteNoModal] = useState<ClienteAFaturar | null>(null);

  const intervalo = intervaloDoPeriodo(periodoId);

  const aFaturar = useQuery<RespostaAFaturar>({
    queryKey: qk.aFaturar(),
    queryFn: () => listarAFaturar() as Promise<RespostaAFaturar>,
    enabled: secao === "a-faturar",
  });

  const filtrosDeEmitidas = {
    de: intervalo?.de,
    ate: intervalo?.ate,
    pagina,
    tamanhoPagina,
  };

  const emitidas = useQuery<RespostaDeFaturas>({
    queryKey: qk.faturas(filtrosDeEmitidas),
    queryFn: () => listarFaturas(filtrosDeEmitidas) as Promise<RespostaDeFaturas>,
    enabled: secao === "emitidas",
    /* Mantém a página anterior na tela enquanto a próxima vem: sem isso a
       tabela pisca para o esqueleto a cada clique na paginação. */
    placeholderData: (anterior) => anterior,
  });

  /* 🔴 O nome do cliente NÃO vem na fatura -- só o id. A busca de clientes é
     a mesma que os formulários usam, então a lista já costuma estar em
     cache; e ela cai para o id quando o cliente saiu do sistema, que é a
     régua do projeto (`useNomeDeSubgrupo` faz igual).

     ⚠️ `sempreLigada` só em "Emitidas": é lá que o nome é PEDIDO sem ninguém
     abrir seletor nenhum. Em "A faturar" o próprio servidor já manda o nome
     junto, e a consulta seria desperdício. */
  const clientes = useClientesBuscaveis(secao === "emitidas");
  const nomeDoCliente = (clienteId: string) =>
    clientes.opcoes.find((o) => o.value === clienteId)?.label ?? clienteId;

  return (
    <>
      <Flex align="center" gap="8px" wrap="wrap" mb="12px">
        {SECOES_DE_FATURAS.map((s) => (
          <PilulaDeFiltro key={s.id} ativo={secao === s.id} onClick={() => setSecao(s.id)}>
            {s.rotulo}
          </PilulaDeFiltro>
        ))}
        {secao === "emitidas" && (
          <SeletorDePeriodo
            periodoId={periodoId}
            blocos={PERIODOS_DE_DINHEIRO}
            onMudar={(novo) => setPeriodoId(novo)}
          />
        )}
      </Flex>

      {secao === "a-faturar" ? (
        <SecaoAFaturar
          clientes={aFaturar.data?.clientes ?? []}
          carregando={aFaturar.isPending}
          erro={aFaturar.isError}
          onTentarDeNovo={() => aFaturar.refetch()}
          onEmitir={setClienteNoModal}
        />
      ) : (
        <SecaoEmitidas
          faturas={emitidas.data?.faturas ?? []}
          carregando={emitidas.isPending}
          erro={emitidas.isError}
          onTentarDeNovo={() => emitidas.refetch()}
          paginacao={{
            pagina,
            /* ⚠️ Zero enquanto a consulta não voltou: é o que impede o
               `Pagination` de mandar a pessoa para a página 1 no meio de uma
               navegação legítima. */
            totalPaginas: emitidas.data?.total_paginas ?? 0,
            total: emitidas.data?.total ?? 0,
            tamanhoPagina,
            onMudarPagina: setPagina,
            onMudarTamanho: setTamanhoPagina,
          }}
          nomeDoCliente={nomeDoCliente}
          onAbrir={(faturaId) => navegar(`/financeiro/faturas/${faturaId}`)}
        />
      )}

      {clienteNoModal && (
        <ModalDeEmissao
          cliente={clienteNoModal}
          onFechar={() => setClienteNoModal(null)}
          onEmitida={(faturaId) => {
            setClienteNoModal(null);
            navegar(`/financeiro/faturas/${faturaId}`);
          }}
        />
      )}
    </>
  );
}
