import type { Lancamento, ParcelaParaEnviar } from "../types";
import type { CamposEditaveisDoLancamento } from "../types/financeiro";
import type { CamposDoLancamento } from "../types/requisicoes";
import { mesmoValor } from "./iguais";

/* 🔴 Mora em `utils/`, e não na pasta da página nem em `services/api`: é
   montagem de corpo de requisição, gêmeo de `camposAlteradosDoAtendimento`
   (`utils/atendimentos.ts`) e de `camposAlterados` (`utils/processos.ts`),
   que é onde a regra foi escrita primeiro. */

/** As parcelas mudaram? Compara por DEPARTAMENTO e por VALOR, na ordem.
 *
 * ⚠️ Função própria porque `mesmoValor` compara lista de `string`, e aqui a
 * lista é de objetos -- ele cairia no `Object.is` e diria "mudou" a cada
 * render, porque o formulário copia as parcelas ao montar. */
function mesmoRateio(a: ParcelaParaEnviar[], b: ParcelaParaEnviar[]): boolean {
  return (
    a.length === b.length &&
    a.every(
      (p, i) =>
        p.subgrupo_id === b[i].subgrupo_id &&
        (p.valor_centavos ?? null) === (b[i].valor_centavos ?? null),
    )
  );
}

/** Só o que MUDOU em relação ao lançamento que está gravado.
 *
 * 🔴 Os três motivos são os de `camposAlterados`, e valem aqui igual:
 * **corrida** (duas pessoas editando campos diferentes não se atropelam),
 * **régua à toa** (o servidor confere conta, categoria e centro a cada campo
 * que chega, mesmo intocado) e a convenção de `PATCH` parcial.
 *
 * 🔴 **`rateio` e `valor_centavos` viajam JUNTOS quando um dos dois muda.** A
 * soma das parcelas tem de ser igual ao valor, e o servidor recusa mudar o
 * valor de um rateado sem receber a divisão nova ("Mudar o valor de um
 * lançamento rateado exige o rateio novo"). Mandar um sem o outro é pedir
 * 400 -- ou, pior, gravar um rateio que aponta para o valor antigo.
 *
 * ⚠️ A parcela ÚNICA vai sem `valor_centavos`: ali o valor só pode ser o do
 * lançamento, e o schema a aceita assim de propósito.
 *
 * ➡️ `utils/lancamentos.test.ts` e
 * `pages/LancamentoDetalhePage/index.test.tsx`.
 */
export function camposAlteradosDoLancamento(
  original: Lancamento,
  atual: CamposEditaveisDoLancamento,
): CamposDoLancamento {
  const mudou: CamposDoLancamento = {};
  const descricao = atual.descricao.trim();
  const contraparte = atual.contraparte.trim();
  const documento = atual.documento.trim();

  if (!mesmoValor(original.descricao, descricao)) mudou.descricao = descricao;
  /* ⚠️ A data vai SOZINHA quando muda -- ela não arrasta o rateio como o
     valor faz, e quem a transforma para os irmãos é o servidor. */
  if (!mesmoValor(original.data_vencimento, atual.dataVencimento)) {
    mudou.data_vencimento = atual.dataVencimento;
  }
  if (!mesmoValor(original.contraparte, contraparte)) mudou.contraparte = contraparte;
  if (!mesmoValor(original.documento_numero, documento)) mudou.documento_numero = documento;
  if (!mesmoValor(original.categoria_id, atual.categoriaId)) {
    mudou.categoria_id = atual.categoriaId;
  }
  if (!mesmoValor(original.centro_id, atual.centroId)) mudou.centro_id = atual.centroId;
  if (!mesmoValor(original.conta_id, atual.contaId)) mudou.conta_id = atual.contaId;
  if (!mesmoValor(original.responsavel, atual.responsavel)) {
    mudou.responsavel = atual.responsavel;
  }

  const valor = atual.valorCentavos ?? 0;
  if (valor !== original.valor_centavos || !mesmoRateio(atual.rateio, original.rateio)) {
    mudou.valor_centavos = valor;
    mudou.rateio =
      atual.rateio.length === 1
        ? [{ subgrupo_id: atual.rateio[0].subgrupo_id }]
        : atual.rateio.map((p) => ({ ...p }));
  }
  return mudou;
}
