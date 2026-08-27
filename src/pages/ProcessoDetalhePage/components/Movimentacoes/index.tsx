import { Box, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { Faixa, ItemDeMovimentacao, ModalDeTarefa, Pagination } from "../../../../components";
import { formatarData, mascararNumeroProcesso, PARAM_DA_ABA } from "../../../../utils";
import {
  MOVIMENTACOES_POR_PAGINA,
  PARAM_DA_COMUNICACAO,
  TAMANHOS_MOVIMENTACOES,
} from "../../constants";
import ModalDeMovimentacao from "../ModalDeMovimentacao";
import type { Comunicacao } from "../../../../types";

interface MovimentacoesProps {
  comunicacoes: Comunicacao[];
}

/** O que o robô coletou no PJe para este processo.
 *
 * O Histórico mostra o mesmo dado para o grupo inteiro; aqui ele responde a
 * pergunta que se faz estando NO processo, sem obrigar a sair da tela e
 * filtrar.
 *
 * A paginação é no cliente porque `GET /processos/{n}/detalhes` devolve
 * tudo de uma vez -- o que ela resolve é a tela crescer sem fim num
 * processo antigo, não o tamanho da resposta.
 *
 * 🔴 A lista não traz mais o teor da publicação; ele vive no modal, que tem
 * endereço próprio na URL. Ver `ItemDeMovimentacao` e `PARAM_DA_COMUNICACAO`.
 */
export default function Movimentacoes({ comunicacoes }: MovimentacoesProps) {
  const navegar = useNavigate();
  /* ⚠️ O subgrupo vem da URL (`/processos/:subgrupoId/:numero`), e não de
     uma busca: o MESMO número de processo vive em vários subgrupos, e é
     justamente por isso que ele está na rota. Aqui não há ambiguidade. */
  const { subgrupoId = "" } = useParams();
  const [criandoTarefa, setCriandoTarefa] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(MOVIMENTACOES_POR_PAGINA);

  /* 🔴 Qual está aberta mora na URL, não em `useState`.
   *
   * A movimentação é a coisa que se abre nesta tela, e coisa que se abre
   * precisa de endereço: assim um F5 devolve o teor que estava na tela, e
   * dá pra mandar "olha essa intimação" pra alguém em vez de mandar o
   * número do processo e pedir pra procurar na lista.
   *
   * Guarda o ID e resolve pela lista -- não o objeto. Um objeto em estado
   * separado seria uma segunda cópia do mesmo dado, que envelhece quando a
   * consulta se atualiza. */
  const [params, setParams] = useSearchParams();
  const idAberto = params.get(PARAM_DA_COMUNICACAO);

  const trocarAberta = (id: string | null) => {
    const proximos = new URLSearchParams(params);
    if (id) proximos.set(PARAM_DA_COMUNICACAO, id);
    else {
      /* Fechar TIRA o parâmetro em vez de esvaziá-lo: `?comunicacao=` no
         fim do endereço é lixo que a pessoa copia junto. */
      proximos.delete(PARAM_DA_COMUNICACAO);
      /* 🔴 ...e CRAVA a aba, senão fechar o teor expulsa a pessoa da lista.
         Quem chega por `?comunicacao=` sem `?aba=` está aqui porque o
         parâmetro do teor manda na aba (ver `ProcessoDetalhePage`); tirar
         só ele fazia a tela cair em Detalhes, que não é de onde a pessoa
         veio. Encontrado em Chrome -- em jsdom o teste fechava o modal e
         nunca olhava pra lista atrás dele. */
      proximos.set(PARAM_DA_ABA, "movimentacoes");
    }
    /* `replace`: abrir e fechar o teor não é um passo do histórico. Sem
       isto, ver três movimentações exigiria três "voltar" pra sair da
       tela. */
    setParams(proximos, { replace: true });
  };

  if (comunicacoes.length === 0) {
    return (
      <Text fontSize="13px" color="fg.subtle">
        Nenhuma movimentação registrada ainda para este processo.
      </Text>
    );
  }

  const aberta =
    idAberto != null
      ? (comunicacoes.find((c) => String(c.comunicacao_id) === idAberto) ?? null)
      : null;

  const totalPaginas = Math.ceil(comunicacoes.length / tamanhoPagina);
  const inicio = (pagina - 1) * tamanhoPagina;
  const visiveis = comunicacoes.slice(inicio, inicio + tamanhoPagina);

  return (
    <Stack gap="0">
      {/* 🔴 Link que aponta pra uma movimentação que não está aqui DIZ isso.
          O caso é real -- link antigo, comunicação que saiu do processo, id
          editado à mão --, e sem o aviso a pessoa clica num link, cai numa
          lista comum e não tem como saber que o que ela veio ver não foi
          encontrado. */}
      {idAberto && !aberta && (
        <Box mb="14px">
          <Faixa tom="aviso" aEsquerda>
            A movimentação deste link não está mais neste processo.
          </Faixa>
        </Box>
      )}

      {/* `m` negativo cancela o padding do cartão: os itens encostam nas
          bordas e as divisórias atravessam a largura toda, como no artifact
          -- lista dentro de cartão não é uma pilha de cartõezinhos. */}
      <Box m="-16px -18px">
        {visiveis.map((c, i) => (
          <ItemDeMovimentacao
            key={`${c.comunicacao_id}-${inicio + i}`}
            titulo={c.tipo_comunicacao || "Comunicação"}
            meta={`${formatarData(c.data_disponibilizacao)} · ${c.nome_orgao}`}
            onAbrir={() => trocarAberta(String(c.comunicacao_id))}
            ultimo={i === visiveis.length - 1}
          />
        ))}
        {/* A barra decide sozinha se aparece; aqui só a divisória depende
            disso, pra não sobrar uma linha solta no fim do cartão. */}
        {comunicacoes.length > Math.min(...TAMANHOS_MOVIMENTACOES) && (
          <Box borderTopWidth="1px" borderTopColor="border.subtle">
            <Pagination
              pagina={pagina}
              totalPaginas={totalPaginas}
              total={comunicacoes.length}
              tamanhoPagina={tamanhoPagina}
              tamanhos={TAMANHOS_MOVIMENTACOES}
              onMudarPagina={setPagina}
              onMudarTamanho={(t) => {
                setTamanhoPagina(t);
                setPagina(1);
              }}
            />
          </Box>
        )}
      </Box>

      {aberta && (
        <ModalDeMovimentacao
          comunicacao={aberta}
          /* 🔴 Só quando houve e-mail. `tem_envio` vem resolvido do servidor
             porque a tela não tem como saber: o robô grava o acervo inteiro
             do processo e só notifica o que está dentro da janela, então a
             maioria das movimentações nunca gerou envio. Oferecer sempre
             levaria pra um Histórico que não tem o registro -- e a tela de
             lá diria "não foi possível localizar", que soa como falha e não
             como "nunca existiu".

             `undefined` (resposta de API anterior a 26/08/2026) também não
             oferece: não saber não é motivo pra prometer. */
          onVerOEnvio={
            aberta.tem_envio
              ? () =>
                  /* Vai direto pro Histórico com o alvo no state -- o mesmo
                     caminho que `RotaRaiz` usa pro link do e-mail, sem o
                     desvio pela raiz. */
                  navegar("/historico", {
                    state: {
                      deepLink: {
                        processo: aberta.numero_processo,
                        comunicacaoId: String(aberta.comunicacao_id),
                      },
                    },
                  })
              : undefined
          }
          onAdicionarTarefa={() => setCriandoTarefa(true)}
          onFechar={() => trocarAberta(null)}
        />
      )}

      {/* ⚠️ Irmão do modal de detalhe, não filho: os dois ficam abertos, e
          quem sai ao salvar é só este. Fechar os dois devolveria a pessoa
          pra lista sem a movimentação que ela estava lendo.

          O Escape fecha só o de cima -- ver a `pilhaDeModais` do `Modal`. */}
      {criandoTarefa && aberta && (
        <ModalDeTarefa
          subgrupoAtual={subgrupoId}
          vinculoInicial={{
            tipo: "processo",
            id: aberta.numero_processo,
            rotulo: mascararNumeroProcesso(aberta.numero_processo),
          }}
          onSalvo={() => setCriandoTarefa(false)}
          onFechar={() => setCriandoTarefa(false)}
        />
      )}
    </Stack>
  );
}
