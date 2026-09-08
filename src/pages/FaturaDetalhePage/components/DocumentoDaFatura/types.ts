import type { FaturaComLancamentos } from "../../../../types";

export interface DocumentoDaFaturaProps {
  fatura: FaturaComLancamentos;
  /** Resolvido por quem chama -- a fatura traz só o id do cliente. Cai para
   * o id quando o cliente saiu do sistema, que é a régua do projeto. */
  nomeDoCliente: string;
  /** Onde o dinheiro caiu, já resolvido em nome.
   *
   * 🔴 A FATURA não guarda isso: quem guarda é cada lançamento, cujo
   * `conta_id` a baixa reescreve com a conta em que o depósito entrou. Quem
   * chama olha as linhas e só manda um nome quando TODAS concordam -- vazio
   * quando divergem, e aí a tela diz isso em vez de escolher uma. */
  contaDoRecebimento: string;
}
