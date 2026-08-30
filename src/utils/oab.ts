import type { ErroDeInscricao } from "../types";

/** A régua da inscrição da OAB, num lugar só.
 *
 * 🔴 Nasceu extraída de `erroDaBusca` (importação por OAB) quando o perfil
 * passou a cadastrar a própria inscrição. Aquela função mistura duas coisas
 * -- a régua da OAB e a comparação de datas do período --, e só a primeira é
 * comum. Copiar as três linhas seria a segunda régua que diverge no primeiro
 * ajuste, num campo cujo erro é silencioso: uma inscrição que o servidor
 * recusa vira 400 na cara de quem digitou certo.
 *
 * ⚠️ Espelha `api/src/shared/oab.py`: dígitos no número, UF da lista fechada.
 * O servidor é quem manda -- isto existe para a pessoa saber ANTES de mandar.
 */

/** As duas partes andam juntas, e a razão é do domínio: a mesma numeração
 * existe nas 27 seccionais, então número sem UF não identifica ninguém.
 *
 * `obrigatoria` separa os dois usos, e a diferença é real:
 *
 * | tela | as duas vazias |
 * |---|---|
 * | importar por OAB | 🔴 erro -- não há o que buscar |
 * | meu perfil | ✅ válido -- é assim que se LIMPA a inscrição |
 *
 * ⚠️ Sem esse parâmetro, o perfil não teria como apagar uma OAB cadastrada
 * por engano: o formulário recusaria o único estado que significa "não tenho".
 */
export function erroDaInscricao(
  numeroOab: string,
  ufOab: string,
  { obrigatoria }: { obrigatoria: boolean },
): ErroDeInscricao {
  const numero = numeroOab.trim();
  const uf = ufOab.trim();

  if (!numero && !uf) {
    return obrigatoria ? { campo: "numeroOab", mensagem: "Informe o número da OAB" } : null;
  }
  if (!numero) return { campo: "numeroOab", mensagem: "Informe o número da OAB" };
  /* ⚠️ Dígitos, e não "não vazio": a régua do servidor recusa `"abc"`, e uma
     inscrição dessas seria consultada no PJe a cada ciclo, casando com nada.
     Ver `oab.normalizar` no lado de lá. */
  if (!/^\d+$/.test(numero)) {
    return { campo: "numeroOab", mensagem: "O número da OAB tem só dígitos" };
  }
  if (!uf) return { campo: "ufOab", mensagem: "Selecione a UF da OAB" };
  return null;
}
