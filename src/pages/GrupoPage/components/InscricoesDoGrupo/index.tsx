import { Box, Flex, Text } from "@chakra-ui/react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  Botao,
  CartaoDeTabela,
  EstadoDeErro,
  EstadoVazio,
  Esqueleto,
  Etiqueta,
  ModalDeConfirmacao,
  Tabela,
  useToast,
} from "../../../../components";
import { useTodosOsSubgrupos } from "../../../../hooks/useCatalogos";
import {
  atualizarConfiguracoesDoGrupo,
  lerConfiguracoesDoGrupo,
} from "../../../../services";
import { ApiError } from "../../../../services/api/client";
import { toastErroMutation } from "../../../../services/queryClient";
import { qk } from "../../../../services/queryKeys";
import { normalizarInscricao, partesDaInscricao } from "../../../../utils/oab";
import LinhaDaInscricao from "../LinhaDaInscricao";
import ModalDaInscricao from "../ModalDaInscricao";
import {
  COLUNAS_DAS_INSCRICOES,
  CORES_DO_CONTADOR_DE_INSCRICOES,
} from "../../constants";
import type { ConfiguracoesDoGrupo, InscricaoAvulsa } from "../../../../types";
import type { PedidoDeGravacao } from "../../types";

/** Quem o modal está editando. `"nova"` é o cadastro; ausente, ele está
 * fechado.
 *
 * ⚠️ Um estado só, e não um par de booleanos "está aberto" / "está editando":
 * dois deles deixariam representável "fechado, editando a 263/MG", que não
 * quer dizer nada -- e alguém teria de lembrar de zerar os dois juntos. */
type NoModal = InscricaoAvulsa | "nova" | null;

/** Sub-aba "Inscrições na OAB": as inscrições do GRUPO.
 *
 * 🔴 **Cada mexida grava sozinha**, como Fases e Situações -- e não um
 * "Salvar" para a lista toda. A tela nunca mostra estado não salvo, e uma
 * inscrição que o tribunal recusa derruba só a própria adição em vez das 50.
 *
 * 🔴 **E toda gravação RELÊ antes de montar o corpo.** O `PATCH` substitui a
 * lista inteira: quem mandar a lista sem uma inscrição a está removendo. Sem a
 * releitura, um `admin` que abrisse a tela, esperasse um colega cadastrar uma
 * OAB e então removesse outra apagaria a do colega junto -- sem erro, sem
 * toast, sem nada na tela dizendo. É a perda silenciosa de dado, que é a pior
 * classe de defeito.
 *
 * ⚠️ **A releitura estreita a janela para milissegundos; não a fecha.** Fechar
 * exigiria versão no recurso (o servidor não tem), e o custo de uma escrita
 * concorrente dentro desses milissegundos não paga esse desenho.
 */
export default function InscricoesDoGrupo() {
  const [noModal, setNoModal] = useState<NoModal>(null);
  const [paraRemover, setParaRemover] = useState<InscricaoAvulsa | null>(null);
  /** A recusa do servidor, mostrada DENTRO do modal.
   *
   * 🔴 Só toast não bastaria: as recusas daqui ("é de alguém com conta", "o
   * tribunal não conhece") são sobre o que está digitado, e o toast some
   * enquanto o formulário continua na tela com o valor recusado. */
  const [erroDoModal, setErroDoModal] = useState("");
  const toast = useToast();
  const queryClient = useQueryClient();

  const query = useQuery<ConfiguracoesDoGrupo>({
    queryKey: qk.configuracoesDoGrupo(),
    queryFn: () => lerConfiguracoesDoGrupo(),
  });
  const subgruposQuery = useTodosOsSubgrupos();

  const salvar = useMutation({
    mutationFn: async ({ aplicar }: PedidoDeGravacao) => {
      /* 🔴 `staleTime: 0` EXPLÍCITO: `fetchQuery` devolve o cache quando o
         dado ainda é fresco, e é exatamente o cache velho que esta releitura
         existe pra não usar. Deixar no padrão global amarraria a correção a
         uma configuração que outra tela pode mudar. */
      const fresco = await queryClient.fetchQuery<ConfiguracoesDoGrupo>({
        queryKey: qk.configuracoesDoGrupo(),
        queryFn: () => lerConfiguracoesDoGrupo(),
        staleTime: 0,
      });
      return atualizarConfiguracoesDoGrupo({
        oabs_avulsas: aplicar(fresco.oabs_avulsas || []).map((i) => ({
          ...partesDaInscricao(i.inscricao),
          importacao_automatica: i.importacao_automatica,
          subgrupos_destino: i.subgrupos_destino,
        })),
      });
    },
    onSuccess: (resposta) => {
      /* A resposta do PATCH é a configuração inteira, já normalizada --
         plantá-la evita o piscar de uma ida a mais ao servidor, e é ela que
         manda: o servidor pode ter deduplicado ou reescrito o que foi
         enviado. */
      queryClient.setQueryData(qk.configuracoesDoGrupo(), resposta);
      setNoModal(null);
      setErroDoModal("");
      setParaRemover(null);
    },
    onError: (err) => {
      /* ⚠️ A mensagem do servidor fica no MODAL enquanto ele estiver aberto, e
         vira toast quando a ação veio da tabela (remover). O modal não se
         fecha no erro: fechá-lo levaria embora o que a pessoa digitou. */
      if (noModal) setErroDoModal(err instanceof ApiError ? err.message : "Não foi possível salvar.");
      else toastErroMutation(toast, err, "Não foi possível salvar.");
    },
  });

  if (query.isPending) return <Esqueleto linhas={3} />;
  if (query.isError) {
    return (
      <CartaoDeTabela>
        <EstadoDeErro
          mensagem="Não foi possível carregar as inscrições."
          onTentarDeNovo={() => query.refetch()}
          tentando={query.isFetching}
        />
      </CartaoDeTabela>
    );
  }

  const inscricoes = query.data!.oabs_avulsas || [];
  const maximo = query.data!.oabs_avulsas_maximo;
  const subgrupos = subgruposQuery.data || [];
  const cheia = inscricoes.length >= maximo;
  /** Qual linha está em voo -- `""` quando o que grava é o modal. */
  const alvoEmVoo = salvar.isPending ? salvar.variables?.alvo : undefined;

  /** Cadastra ou reescreve uma inscrição, conforme o modal esteja editando. */
  function salvarDoModal(numero: string, uf: string, ligada: boolean, destinos: string[]) {
    const alvo = normalizarInscricao(numero, uf);
    const nova: InscricaoAvulsa = {
      inscricao: alvo,
      importacao_automatica: ligada,
      subgrupos_destino: destinos,
    };
    /* 🔴 A repetida é barrada AQUI porque o servidor a ignora em SILÊNCIO --
       "a primeira vence", diz `definir_oabs_avulsas`. Mandando assim, o PATCH
       responderia 200 com a lista do mesmo tamanho, e a pessoa concluiria que
       a tela engoliu o cadastro. */
    if (noModal === "nova" && inscricoes.some((i) => i.inscricao === alvo)) {
      setErroDoModal("Esta inscrição já está na lista.");
      return;
    }
    setErroDoModal("");
    salvar.mutate({
      alvo: "",
      aplicar: (atuais) =>
        atuais.some((i) => i.inscricao === alvo)
          ? atuais.map((i) => (i.inscricao === alvo ? nova : i))
          : [...atuais, nova],
    });
  }

  return (
    <>
      <CartaoDeTabela>
        {/* ── o cabeçalho da seção, DENTRO do cartão ──
            🔴 Dentro e não acima, com a divisória embaixo: é o arranjo de
            `FormularioNovaOpcao` na aba irmã, e o motivo é o mesmo -- fora do
            cartão, o título e o botão viram um bloco solto na página, e a ação
            deixa de parecer parte da lista que ela alimenta. */}
        <Flex
          align="flex-start"
          justify="space-between"
          gap="16px"
          wrap="wrap"
          p="10px 14px 14px"
          mb="4px"
          borderBottomWidth="1px"
          borderBottomColor="border.subtle"
        >
          <Box>
            <Flex align="center" gap="6px" mb="4px">
              <Text fontSize="14px" fontWeight="800">
                Inscrições da OAB
              </Text>
              {/* 🔴 O contador é o teto TORNADO VISÍVEL, e é por isso que ele
                  aparece sempre -- e não só quando a lista enche. O limite de
                  50 é carga contra um tribunal, não espaço: quem descobre que
                  ele existe só ao esbarrar nele já planejou errado. */}
              <Etiqueta cores={CORES_DO_CONTADOR_DE_INSCRICOES}>
                {`${inscricoes.length} de ${maximo}`}
              </Etiqueta>
            </Flex>
            {/* ⚠️ A dica diz o CUSTO, que é o que só ela diz: o que a inscrição
                faz está no modal, junto do interruptor que decide. */}
            <Text fontSize="11.5px" color="fg.subtle">
              Cada inscrição vira uma consulta ao tribunal por ciclo, três vezes ao dia.
            </Text>
            {cheia && (
              <Text mt="4px" fontSize="11.5px" color="fg.subtle">
                Limite atingido. Remova uma para cadastrar outra.
              </Text>
            )}
          </Box>
          <Botao
            flex="none"
            disabled={cheia}
            title={cheia ? "Limite de inscrições atingido" : undefined}
            onClick={() => {
              setErroDoModal("");
              setNoModal("nova");
            }}
          >
            Adicionar inscrição
          </Botao>
        </Flex>

        <Tabela
          colunas={COLUNAS_DAS_INSCRICOES}
          vazio={
            inscricoes.length === 0 ? (
              <EstadoVazio mensagem="Nenhuma inscrição cadastrada." />
            ) : undefined
          }
        >
          {inscricoes.map((i) => (
            <LinhaDaInscricao
              key={i.inscricao}
              inscricao={i}
              subgrupos={subgrupos}
              emAndamento={alvoEmVoo === i.inscricao}
              onAbrir={() => {
                setErroDoModal("");
                setNoModal(i);
              }}
              onDesligar={() =>
                salvar.mutate({
                  alvo: i.inscricao,
                  aplicar: (atuais) =>
                    atuais.map((a) =>
                      a.inscricao === i.inscricao
                        ? /* Zerado ao desligar, espelhando o servidor: mandar
                             destino com o interruptor em `false` faria a tela
                             e o banco discordarem sobre o que foi pedido. */
                          { ...a, importacao_automatica: false, subgrupos_destino: [] }
                        : a,
                    ),
                })
              }
              onRemover={() => setParaRemover(i)}
            />
          ))}
        </Tabela>

        {subgruposQuery.isError && (
          <Text px="14px" pb="10px" fontSize="12px" color="status.bad">
            Não foi possível carregar os subgrupos. Sem eles não dá para escolher o
            destino.
          </Text>
        )}
      </CartaoDeTabela>

      {noModal && (
        <ModalDaInscricao
          inscricao={noModal === "nova" ? undefined : noModal}
          subgrupos={subgrupos}
          carregandoSubgrupos={subgruposQuery.isPending}
          salvando={salvar.isPending}
          erro={erroDoModal || undefined}
          onSalvar={salvarDoModal}
          onFechar={() => {
            setNoModal(null);
            setErroDoModal("");
          }}
        />
      )}

      {paraRemover && (
        <ModalDeConfirmacao
          titulo="Remover inscrição"
          mensagem={
            <>
              <strong>{paraRemover.inscricao}</strong> deixa de ser acompanhada.
            </>
          }
          /* 🔴 O que se perde é a VIGILÂNCIA daqui em diante, e nada do que já
             foi cadastrado. Dizer isso é o que separa "remover uma inscrição"
             de "apagar os processos dela", que é o medo natural. */
          aviso="Os processos já cadastrados continuam no sistema. O que para é o acompanhamento das movimentações novas desta inscrição."
          rotulo="Remover"
          confirmando={salvar.isPending}
          onConfirmar={() =>
            salvar.mutate({
              alvo: paraRemover.inscricao,
              aplicar: (atuais) =>
                atuais.filter((i) => i.inscricao !== paraRemover.inscricao),
            })
          }
          onFechar={() => setParaRemover(null)}
        />
      )}
    </>
  );
}
