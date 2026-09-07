import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useToast } from "../../../contexts/ToastContext";
import {
  atualizarCentroDeCusto,
  criarCentroDeCusto,
  desativarItemFinanceiro,
  reativarItemFinanceiro,
} from "../../../services";
import { ApiError } from "../../../services/api/client";
import { toastErroMutation } from "../../../services/queryClient";
import { qk } from "../../../services/queryKeys";
import type { CentroDeCusto } from "../../../types";

/** Criar, renomear e ligar/desligar um centro de custo.
 *
 * ⚠️ Uma mutação para as três ações: todas invalidam o MESMO catálogo, e três
 * `useMutation` repetiriam o `onError` e o `invalidateQueries`.
 *
 * 🔴 O erro do MODAL fica no modal, e o da linha (ligar/desligar) vira toast:
 * é a mesma régua dos outros dois -- fechar a janela levaria embora o que a
 * pessoa digitou, e a ação da linha não tem janela onde pôr a mensagem.
 *
 * ➡️ `pages/FinanceiroPage/index.test.tsx`.
 */
export function useSalvarCentro(
  aoTerminar: (outro: boolean) => void,
  aoFalharNoModal: (mensagem: string) => void,
) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (pedido: {
      nome?: string;
      centro?: CentroDeCusto;
      alternar?: boolean;
      /** `Salvar e adicionar outro`: o modal fica aberto e vazio. */
      outro?: boolean;
    }) => {
      if (pedido.alternar && pedido.centro) {
        const acao = pedido.centro.ativo ? desativarItemFinanceiro : reativarItemFinanceiro;
        return acao("centros-de-custo", pedido.centro.centro_id);
      }
      if (pedido.centro) {
        return atualizarCentroDeCusto(pedido.centro.centro_id, { nome: pedido.nome! });
      }
      return criarCentroDeCusto({ nome: pedido.nome! });
    },
    onSuccess: (_resposta, pedido) => {
      queryClient.invalidateQueries({ queryKey: qk.catalogoFinanceiro() });
      aoTerminar(Boolean(pedido.outro));
      toast.sucesso(
        pedido.alternar
          ? "Centro de custo atualizado."
          : pedido.centro
            ? "Centro de custo renomeado."
            : "Centro de custo criado.",
      );
    },
    onError: (err, pedido) => {
      if (pedido.alternar) {
        toastErroMutation(toast, err, "Não foi possível alterar o centro de custo.");
      } else {
        aoFalharNoModal(
          err instanceof ApiError ? err.message : "Não foi possível salvar o centro de custo.",
        );
      }
    },
  });
}
