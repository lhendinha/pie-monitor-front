import type { EnderecoDoCliente } from "../types";
import { apenasDigitos } from "./mask";

/** Os sete campos de endereço achatados como a API os espera, no corpo de
 * `POST`/`PATCH /clientes`.
 *
 * ⚠️ `""` pros ausentes, nunca omitir a chave: no PATCH um campo omitido
 * significa "não toca", então mandar o bloco INTEIRO é o que faz esvaziar
 * um campo de endereço realmente esvaziá-lo.
 *
 * ⚠️ E `cep` vai só com DÍGITOS: a API valida 8 dígitos e guarda sem
 * máscara, como `cpf_cnpj` e `telefone`. Mandar `"30130-010"` daria 400.
 */
export function corpoDoEndereco(endereco?: EnderecoDoCliente) {
  return {
    cep: apenasDigitos(endereco?.cep) || "",
    logradouro: endereco?.logradouro?.trim() || "",
    numero: endereco?.numero?.trim() || "",
    complemento: endereco?.complemento?.trim() || "",
    bairro: endereco?.bairro?.trim() || "",
    cidade: endereco?.cidade?.trim() || "",
    uf: endereco?.uf?.trim() || "",
  };
}
