import type { CamposDoLancamento } from "../../types/requisicoes";
import type { Lancamento } from "../../types";
import type { CamposEditaveisDoLancamento } from "./components/FormularioDoLancamento/types";

/** O corpo do `PATCH` com SÓ o que mudou.
 *
 * 🔴 É a régua do projeto, e ela tem três motivos escritos em
 * `FormularioProcesso`: duas pessoas editando campos diferentes não se
 * atropelam, réguas do servidor não rodam à toa sobre campos intocados, e é
 * o que "PATCH parcial" quer dizer. O atendimento era o outlier e deixou de
 * ser -- ver `CONTEXT.md`.
 *
 * 🔴 **`rateio` e `valor_centavos` viajam JUNTOS quando um dos dois muda.** A
 * soma das parcelas tem de ser igual ao valor, e o servidor recusa mudar o
 * valor de um lançamento rateado sem receber a divisão nova ("Mudar o valor
 * de um lançamento rateado exige o rateio novo"). Mandar um sem o outro é
 * pedir 400 -- ou, pior, gravar um rateio que aponta para o valor antigo.
 *
 * ⚠️ A parcela ÚNICA vai sem `valor_centavos`: ali o valor só pode ser o do
 * lançamento, e o schema a aceita assim de propósito.
 */
export function camposAlteradosDoLancamento(
  original: Lancamento,
  editado: CamposEditaveisDoLancamento,
): CamposDoLancamento {
  const campos: CamposDoLancamento = {};
  const descricao = editado.descricao.trim();
  const contraparte = editado.contraparte.trim();
  const documento = editado.documento.trim();

  if (descricao !== original.descricao) campos.descricao = descricao;
  if (contraparte !== original.contraparte) campos.contraparte = contraparte;
  if (documento !== original.documento_numero) campos.documento_numero = documento;
  if (editado.categoriaId !== original.categoria_id) campos.categoria_id = editado.categoriaId;
  if (editado.centroId !== original.centro_id) campos.centro_id = editado.centroId;
  if (editado.contaId !== original.conta_id) campos.conta_id = editado.contaId;
  if (editado.responsavel !== original.responsavel) campos.responsavel = editado.responsavel;

  const valor = editado.valorCentavos ?? 0;
  const valorMudou = valor !== original.valor_centavos;
  const rateioMudou = JSON.stringify(editado.rateio) !== JSON.stringify(original.rateio);
  if (valorMudou || rateioMudou) {
    campos.valor_centavos = valor;
    campos.rateio =
      editado.rateio.length === 1
        ? [{ subgrupo_id: editado.rateio[0].subgrupo_id }]
        : editado.rateio.map((p) => ({ ...p }));
  }
  return campos;
}
