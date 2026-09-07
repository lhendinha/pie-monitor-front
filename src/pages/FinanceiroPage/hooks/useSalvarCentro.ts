import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useToast } from "../../../contexts/ToastContext";
import {
  atualizarCentroDeCusto,
  criarCentroDeCusto,
  desativarItemFinanceiro,
  reativarItemFinanceiro,
} from "../../../services";
import { toastErroMutation } from "../../../services/queryClient";
import { qk } from "../../../services/queryKeys";
import type { CentroDeCusto } from "../../../types";

/** Criar, renomear e ligar/desligar um centro de custo.
 *
 * ⚠️ Uma mutação para as três ações: todas invalidam o MESMO catálogo, e três
 * `useMutation` repetiriam o `onError` e o `invalidateQueries`.
 *
 * 🔴 O erro vira TOAST, e não mensagem no formulário: centro de custo não tem
 * modal -- ele nasce e se renomeia na própria linha, e não há janela onde a
 * mensagem pudesse ficar ao lado do que foi digitado.
 *
 * ➡️ `pages/FinanceiroPage/index.test.tsx`.
 */
export function useSalvarCentro(aoTerminar: () => void) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (pedido: { nome?: string; centro?: CentroDeCusto; alternar?: boolean }) => {
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
      aoTerminar();
      toast.sucesso(
        pedido.alternar
          ? "Centro de custo atualizado."
          : pedido.centro
            ? "Centro de custo renomeado."
            : "Centro de custo criado.",
      );
    },
    onError: (err) => toastErroMutation(toast, err, "Não foi possível salvar o centro de custo."),
  });
}
