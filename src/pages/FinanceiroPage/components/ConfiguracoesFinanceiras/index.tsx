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
import { useToast } from "../../../../contexts/ToastContext";
import {
  atualizarCategoria,
  atualizarConta,
  criarCategoria,
  criarConta,
  desativarItemFinanceiro,
  lerCatalogoFinanceiro,
  papelAtende,
  reativarItemFinanceiro,
} from "../../../../services";
import { ApiError } from "../../../../services/api/client";
import { toastErroMutation, useToastOnQueryError } from "../../../../services/queryClient";
import { qk } from "../../../../services/queryKeys";
import type {
  CatalogoFinanceiro,
  CategoriaFinanceira,
  ContaFinanceira,
} from "../../../../types";
import type { DadosDaCategoria, DadosDaConta } from "../../../../types/requisicoes";
import { useSalvarCentro } from "../../hooks/useSalvarCentro";
import ModalDeCategoria from "../ModalDeCategoria";
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
  const [secao, setSecao] = useState<SecaoDoCatalogo>("categorias");
  /** `null` = fechado; `undefined` dentro dele = criando. */
  const [categoriaNoModal, setCategoriaNoModal] =
    useState<{ categoria?: CategoriaFinanceira } | null>(null);
  const [contaNoModal, setContaNoModal] = useState<{ conta?: ContaFinanceira } | null>(null);
  /** Qual centro está com o nome aberto. Vazio = nenhum. */
  const [centroEmEdicao, setCentroEmEdicao] = useState("");
  const [erroDoModal, setErroDoModal] = useState("");
  const podeEscrever = papelAtende(PISO_PARA_ESCREVER);
  const queryClient = useQueryClient();
  const toast = useToast();
  const salvarCentro = useSalvarCentro(() => setCentroEmEdicao(""));
  const query = useQuery<CatalogoFinanceiro>({
    queryKey: qk.catalogoFinanceiro(),
    queryFn: lerCatalogoFinanceiro,
  });
  useToastOnQueryError(query.error, "Não foi possível carregar o catálogo do Financeiro.");

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
        const acao = pedido.categoria.ativa ? desativarItemFinanceiro : reativarItemFinanceiro;
        return acao("categorias", pedido.categoria.categoria_id);
      }
      if (pedido.categoria) {
        return atualizarCategoria(pedido.categoria.categoria_id, {
          nome: pedido.dados!.nome,
        });
      }
      return criarCategoria(pedido.dados!);
    },
    onSuccess: (_resposta, pedido) => {
      queryClient.invalidateQueries({ queryKey: qk.catalogoFinanceiro() });
      setErroDoModal("");
      /* 🔴 "Salvar e adicionar outra" mantém o modal aberto e VAZIO: remontar
         com `key` novo é o que zera os campos sem o modal piscar. */
      setCategoriaNoModal(pedido.outra ? { categoria: undefined } : null);
      toast.sucesso(pedido.alternar ? "Categoria atualizada." : "Categoria salva.");
    },
    onError: (err, pedido) => {
      /* ⚠️ A mensagem do servidor (409 de nome repetido) fica NO MODAL: fechá-lo
         levaria embora o que a pessoa digitou. Quando a ação veio da linha
         (ligar/desligar), não há modal aberto -- aí é toast. */
      if (pedido.alternar) toastErroMutation(toast, err, "Não foi possível alterar a categoria.");
      else {
        setErroDoModal(
          err instanceof ApiError ? err.message : "Não foi possível salvar a categoria.",
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
        const acao = pedido.conta.ativa ? desativarItemFinanceiro : reativarItemFinanceiro;
        return acao("contas", pedido.conta.conta_id);
      }
      if (pedido.conta) {
        return atualizarConta(pedido.conta.conta_id, { nome: pedido.dados!.nome });
      }
      return criarConta(pedido.dados!);
    },
    onSuccess: (_resposta, pedido) => {
      queryClient.invalidateQueries({ queryKey: qk.catalogoFinanceiro() });
      setErroDoModal("");
      setContaNoModal(null);
      toast.sucesso(pedido.alternar ? "Conta atualizada." : "Conta salva.");
    },
    onError: (err, pedido) => {
      if (pedido.alternar) toastErroMutation(toast, err, "Não foi possível alterar a conta.");
      else {
        setErroDoModal(err instanceof ApiError ? err.message : "Não foi possível salvar a conta.");
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

  return (
    <Stack gap="14px" mt="14px">
      <Stack direction="row" gap="8px" wrap="wrap">
        {SECOES_DO_CATALOGO.map((s) => (
          <PilulaDeFiltro key={s.id} ativo={secao === s.id} onClick={() => setSecao(s.id)}>
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
              centros={catalogo.centros_de_custo}
              podeEscrever={podeEscrever}
              centroEmEdicao={centroEmEdicao}
              salvando={salvarCentro.isPending}
              onAdicionar={(nome) => salvarCentro.mutate({ nome })}
              onIniciarEdicao={setCentroEmEdicao}
              onRenomear={(centroId, nome) =>
                salvarCentro.mutate({
                  nome,
                  centro: catalogo.centros_de_custo.find((c) => c.centro_id === centroId),
                })
              }
              onCancelarEdicao={() => setCentroEmEdicao("")}
              onAlternarAtivo={(centro) => salvarCentro.mutate({ centro, alternar: true })}
            />
          )}
          {secao === "contas" && (
            <ListaDeContas
              contas={catalogo.contas}
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
              onAlternarAtivo={(conta) => salvarConta.mutate({ conta, alternar: true })}
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

      {contaNoModal && (
        <ModalDeConta
          key={contaNoModal.conta?.conta_id ?? "nova"}
          conta={contaNoModal.conta}
          salvando={salvarConta.isPending}
          erro={erroDoModal}
          onSalvar={(dados) => salvarConta.mutate({ dados, conta: contaNoModal.conta })}
          onFechar={() => setContaNoModal(null)}
        />
      )}
    </Stack>
  );
}
