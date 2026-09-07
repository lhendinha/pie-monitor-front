import { Stack, Text } from "@chakra-ui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  CartaoDeTabela,
  Esqueleto,
  EstadoDeErro,
  EstadoVazio,
  PilulaDeFiltro,
} from "../../../../components";
import { useEstadoNaUrl } from "../../../../hooks/useEstadoNaUrl";
import { usePaginacaoDaLista } from "../../../../hooks/usePaginacaoDaLista";
import { useToast } from "../../../../contexts/ToastContext";
import {
  atualizarCategoria,
  atualizarConta,
  criarCategoria,
  criarConta,
  desativarItemFinanceiro,
  lerCatalogoFinanceiro,
  listarCentrosDeCusto,
  listarContas,
  papelAtende,
  reativarItemFinanceiro,
} from "../../../../services";
import { ApiError } from "../../../../services/api/client";
import {
  invalidarCatalogoFinanceiro,
  toastErroMutation,
  useToastOnQueryError,
} from "../../../../services/queryClient";
import { qk } from "../../../../services/queryKeys";
import type {
  CatalogoFinanceiro,
  CategoriaFinanceira,
  CentroDeCusto,
  ContaFinanceira,
} from "../../../../types";
import type {
  RespostaDeCentrosPaginada,
  RespostaDeContasPaginada,
} from "../../../../types/respostas";
import type {
  DadosDaCategoria,
  DadosDaConta,
} from "../../../../types/requisicoes";
import { useSalvarCentro } from "../../hooks/useSalvarCentro";
import ModalDeCategoria from "../ModalDeCategoria";
import ModalDeCentro from "../ModalDeCentro";
import ModalDeConta from "../ModalDeConta";
import ListaDeCategorias from "../ListaDeCategorias";
import ListaDeCentros from "../ListaDeCentros";
import ListaDeContas from "../ListaDeContas";
import { PISO_PARA_ESCREVER, SECOES_DO_CATALOGO } from "./constants";
import type { SecaoDoCatalogo } from "./types";

/** Contas, categorias e centros de custo -- o que todo lançamento escolhe.
 *
 * 🔴 UMA leitura serve as três listas. `GET /financeiro/catalogo` devolve
 * tudo numa Query, então três consultas dariam três esqueletos numa tela só
 * e três chances de uma falhar sozinha.
 *
 * ⚠️ A seção fica em estado local, e não na URL: são recortes de uma tela de
 * configuração, e a Área de trabalho não linka para dentro deles -- é a
 * mesma régua de `utils/abas`, aplicada um nível abaixo.
 *
 * ➡️ `index.test.tsx`.
 */
export default function ConfiguracoesFinanceiras() {
  /** 🔴 A seção vai para a URL agora que contas e centros PAGINAM: sem ela
   * lá, `?pagina=2` não diria de qual lista é, e um F5 cairia na página 2 de
   * outra coisa. Trocar de pílula APAGA a página -- a 3 de contas não existe
   * em centros, e a tabela apareceria vazia até o `Pagination` corrigir.
   *
   * ⚠️ Era estado local, com a razão escrita de que "a Área de trabalho não
   * linka para dentro deles". Continua verdade; o que mudou é que agora há
   * um segundo parâmetro que depende deste para fazer sentido. */
  const [secao, setSecao] = useEstadoNaUrl<SecaoDoCatalogo>(
    "secao",
    "categorias",
    {
      tambemApaga: ["pagina"],
    },
  );
  const { pagina, setPagina, tamanhoPagina, setTamanhoPagina } =
    usePaginacaoDaLista();
  /** `null` = fechado; `undefined` dentro dele = criando. */
  const [categoriaNoModal, setCategoriaNoModal] = useState<{
    categoria?: CategoriaFinanceira;
  } | null>(null);
  const [contaNoModal, setContaNoModal] = useState<{
    conta?: ContaFinanceira;
  } | null>(null);
  const [centroNoModal, setCentroNoModal] = useState<{
    centro?: CentroDeCusto;
  } | null>(null);
  const [erroDoModal, setErroDoModal] = useState("");
  const podeEscrever = papelAtende(PISO_PARA_ESCREVER);
  const queryClient = useQueryClient();
  const toast = useToast();
  const salvarCentro = useSalvarCentro(
    (outro) => {
      setErroDoModal("");
      setCentroNoModal(outro ? { centro: undefined } : null);
    },
    (mensagem) => setErroDoModal(mensagem),
  );
  /** 🔴 O catálogo INTEIRO continua sendo lido, e não é desperdício: é dele
   * que saem as categorias (que não paginam, por causa do agrupador), as
   * cores da paleta e a `conta_padrao_id` que marca a etiqueta "Padrão". As
   * duas consultas abaixo servem só as TABELAS que paginam. */
  const query = useQuery<CatalogoFinanceiro>({
    queryKey: qk.catalogoFinanceiro(),
    queryFn: lerCatalogoFinanceiro,
  });
  useToastOnQueryError(
    query.error,
    "Não foi possível carregar o catálogo do Financeiro.",
  );

  /** ⚠️ `enabled` pela seção: montar as três de uma vez dispararia duas
   * leituras que ninguém vai ver, e a tela mostra UMA lista por vez. */
  const paginaDeContas = useQuery<RespostaDeContasPaginada>({
    queryKey: qk.contasFinanceiras({ pagina, tamanhoPagina }),
    queryFn: () => listarContas({ pagina, tamanhoPagina }),
    enabled: secao === "contas",
    placeholderData: (anterior) => anterior,
  });
  useToastOnQueryError(
    paginaDeContas.error,
    "Não foi possível carregar as contas.",
  );

  const paginaDeCentros = useQuery<RespostaDeCentrosPaginada>({
    queryKey: qk.centrosDeCusto({ pagina, tamanhoPagina }),
    queryFn: () => listarCentrosDeCusto({ pagina, tamanhoPagina }),
    enabled: secao === "centros",
    placeholderData: (anterior) => anterior,
  });
  useToastOnQueryError(
    paginaDeCentros.error,
    "Não foi possível carregar os centros de custo.",
  );

  /** ⚠️ Uma mutação para as três ações da categoria (criar, renomear,
   * ligar/desligar): todas invalidam o MESMO catálogo, e três `useMutation`
   * repetiriam o `onError` que decide entre modal e toast. */
  const salvarCategoria = useMutation({
    mutationFn: async (pedido: {
      dados?: DadosDaCategoria;
      categoria?: CategoriaFinanceira;
      alternar?: boolean;
      outra?: boolean;
    }) => {
      if (pedido.alternar && pedido.categoria) {
        const acao = pedido.categoria.ativa
          ? desativarItemFinanceiro
          : reativarItemFinanceiro;
        return acao("categorias", pedido.categoria.categoria_id);
      }
      if (pedido.categoria) {
        /* ⚠️ Sem `natureza`: a API responde 422 se ela vier, e o modal nem
           a mostra na edição. Ver `CamposDaCategoria`. */
        return atualizarCategoria(pedido.categoria.categoria_id, {
          nome: pedido.dados!.nome,
          cor: pedido.dados!.cor,
          agrupador_id: pedido.dados!.agrupador_id ?? "",
        });
      }
      return criarCategoria(pedido.dados!);
    },
    onSuccess: (_resposta, pedido) => {
      invalidarCatalogoFinanceiro(queryClient);
      setErroDoModal("");
      /* 🔴 "Salvar e adicionar outra" mantém o modal aberto e VAZIO: remontar
         com `key` novo é o que zera os campos sem o modal piscar. */
      setCategoriaNoModal(pedido.outra ? { categoria: undefined } : null);
      toast.sucesso(
        pedido.alternar ? "Categoria atualizada." : "Categoria salva.",
      );
    },
    onError: (err, pedido) => {
      /* ⚠️ A mensagem do servidor (409 de nome repetido) fica NO MODAL: fechá-lo
         levaria embora o que a pessoa digitou. Quando a ação veio da linha
         (ligar/desligar), não há modal aberto -- aí é toast. */
      if (pedido.alternar)
        toastErroMutation(toast, err, "Não foi possível alterar a categoria.");
      else {
        setErroDoModal(
          err instanceof ApiError
            ? err.message
            : "Não foi possível salvar a categoria.",
        );
      }
    },
  });

  /** Gêmea de `salvarCategoria`, e separada dela porque os corpos são
   * diferentes: a conta nasce com sete campos e é renomeada com um. */
  const salvarConta = useMutation({
    mutationFn: async (pedido: {
      dados?: DadosDaConta;
      conta?: ContaFinanceira;
      alternar?: boolean;
    }) => {
      if (pedido.alternar && pedido.conta) {
        const acao = pedido.conta.ativa
          ? desativarItemFinanceiro
          : reativarItemFinanceiro;
        return acao("contas", pedido.conta.conta_id);
      }
      if (pedido.conta) {
        /* ⚠️ Sem `tipo`, `inicio` nem saldo: 422. Ver `CamposDaConta`. */
        return atualizarConta(pedido.conta.conta_id, {
          nome: pedido.dados!.nome,
          banco: pedido.dados!.banco ?? "",
          agencia: pedido.dados!.agencia ?? "",
          numero: pedido.dados!.numero ?? "",
        });
      }
      return criarConta(pedido.dados!);
    },
    onSuccess: (_resposta, pedido) => {
      invalidarCatalogoFinanceiro(queryClient);
      setErroDoModal("");
      setContaNoModal(null);
      toast.sucesso(pedido.alternar ? "Conta atualizada." : "Conta salva.");
    },
    onError: (err, pedido) => {
      if (pedido.alternar)
        toastErroMutation(toast, err, "Não foi possível alterar a conta.");
      else {
        setErroDoModal(
          err instanceof ApiError
            ? err.message
            : "Não foi possível salvar a conta.",
        );
      }
    },
  });

  if (query.isPending) return <Esqueleto linhas={4} />;
  if (query.isError) {
    return (
      <CartaoDeTabela>
        <EstadoDeErro
          mensagem="Não foi possível carregar o catálogo do Financeiro."
          onTentarDeNovo={() => query.refetch()}
          tentando={query.isFetching}
        />
      </CartaoDeTabela>
    );
  }

  const catalogo = query.data;
  const vazio =
    catalogo.contas.length === 0 &&
    catalogo.categorias.length === 0 &&
    catalogo.centros_de_custo.length === 0;

  /** O `PaginationProps` da seção aberta.
   *
   * ⚠️ Enquanto a consulta não voltou, `total` e `totalPaginas` são 0: é o
   * que impede o `Pagination` de mandar a pessoa para a página 1 no meio de
   * uma navegação legítima (o efeito dele só age com `totalPaginas >= 1`). */
  const paginacaoDe = (resposta?: {
    total: number;
    total_paginas: number;
  }) => ({
    pagina,
    totalPaginas: resposta?.total_paginas ?? 0,
    total: resposta?.total ?? 0,
    tamanhoPagina,
    onMudarPagina: setPagina,
    onMudarTamanho: setTamanhoPagina,
  });

  return (
    <Stack gap="14px" mt="14px">
      <Stack direction="row" gap="8px" wrap="wrap">
        {SECOES_DO_CATALOGO.map((s) => (
          <PilulaDeFiltro
            key={s.id}
            ativo={secao === s.id}
            onClick={() => setSecao(s.id)}
          >
            {s.rotulo}
          </PilulaDeFiltro>
        ))}
      </Stack>

      {vazio ? (
        <CartaoDeTabela>
          <EstadoVazio mensagem="O catálogo ainda não foi criado neste escritório." />
        </CartaoDeTabela>
      ) : (
        <>
          {secao === "categorias" && (
            <ListaDeCategorias
              categorias={catalogo.categorias}
              podeEscrever={podeEscrever}
              onNova={() => {
                setErroDoModal("");
                setCategoriaNoModal({ categoria: undefined });
              }}
              onEditar={(categoria) => {
                setErroDoModal("");
                setCategoriaNoModal({ categoria });
              }}
              onAlternarAtivo={(categoria) =>
                salvarCategoria.mutate({ categoria, alternar: true })
              }
            />
          )}
          {secao === "centros" && (
            <ListaDeCentros
              centros={paginaDeCentros.data?.centros_de_custo ?? []}
              carregando={paginaDeCentros.isPending}
              paginacao={paginacaoDe(paginaDeCentros.data)}
              podeEscrever={podeEscrever}
              onNovo={() => {
                setErroDoModal("");
                setCentroNoModal({ centro: undefined });
              }}
              onEditar={(centro) => {
                setErroDoModal("");
                setCentroNoModal({ centro });
              }}
              onAlternarAtivo={(centro) =>
                salvarCentro.mutate({ centro, alternar: true })
              }
            />
          )}
          {secao === "contas" && (
            <ListaDeContas
              contas={paginaDeContas.data?.contas ?? []}
              carregando={paginaDeContas.isPending}
              paginacao={paginacaoDe(paginaDeContas.data)}
              contaPadraoId={catalogo.conta_padrao_id}
              podeEscrever={podeEscrever}
              onNova={() => {
                setErroDoModal("");
                setContaNoModal({ conta: undefined });
              }}
              onEditar={(conta) => {
                setErroDoModal("");
                setContaNoModal({ conta });
              }}
              onAlternarAtivo={(conta) =>
                salvarConta.mutate({ conta, alternar: true })
              }
            />
          )}
        </>
      )}

      {!podeEscrever && (
        <Text fontSize="12px" color="text.muted">
          Só quem administra o grupo pode alterar o catálogo.
        </Text>
      )}

      {/* 🔴 Fora de qualquer ramo condicional da tela: modal dentro de um
          `if` que troca REMONTA vazio com a pessoa digitando -- a armadilha
          que o docstring do `Modal` descreve. */}
      {categoriaNoModal && (
        <ModalDeCategoria
          key={categoriaNoModal.categoria?.categoria_id ?? "nova"}
          categoria={categoriaNoModal.categoria}
          categorias={catalogo.categorias}
          cores={catalogo.cores_disponiveis}
          salvando={salvarCategoria.isPending}
          erro={erroDoModal}
          onSalvar={(dados, outra) =>
            salvarCategoria.mutate({
              dados,
              categoria: categoriaNoModal.categoria,
              outra,
            })
          }
          onFechar={() => setCategoriaNoModal(null)}
        />
      )}

      {centroNoModal && (
        <ModalDeCentro
          key={centroNoModal.centro?.centro_id ?? "novo"}
          centro={centroNoModal.centro}
          salvando={salvarCentro.isPending}
          erro={erroDoModal}
          onSalvar={(nome, outro) =>
            salvarCentro.mutate({ nome, centro: centroNoModal.centro, outro })
          }
          onFechar={() => setCentroNoModal(null)}
        />
      )}

      {contaNoModal && (
        <ModalDeConta
          key={contaNoModal.conta?.conta_id ?? "nova"}
          conta={contaNoModal.conta}
          salvando={salvarConta.isPending}
          erro={erroDoModal}
          onSalvar={(dados) =>
            salvarConta.mutate({ dados, conta: contaNoModal.conta })
          }
          onFechar={() => setContaNoModal(null)}
        />
      )}
    </Stack>
  );
}
