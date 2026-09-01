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

/** `("263", "mg")` -> `"263/MG"`. A forma canônica de `api/src/shared/oab.py`.
 *
 * 🔴 Existe para COMPARAR, não para mandar: o servidor normaliza de novo na
 * entrada, e é a versão dele que fica gravada. O que a tela precisa é saber se
 * a inscrição que a pessoa acabou de digitar já está na lista -- e `"263"/"mg"`
 * e `"263"/"MG"` são a mesma, então comparar o que foi digitado contra o que
 * está gravado só funciona pela forma canônica.
 *
 * ⚠️ **Não valida.** Quem recusa `"abc"` é `erroDaInscricao`, antes daqui.
 * Duplicar a régua criaria a segunda que diverge no primeiro ajuste. */
export function normalizarInscricao(numeroOab: string, ufOab: string): string {
  return `${numeroOab.trim()}/${ufOab.trim().toUpperCase()}`;
}

/** `"263/MG"` -> `{ numero: "263", uf: "MG" }`.
 *
 * 🔴 O caminho de VOLTA, e ele é necessário porque o `PATCH` pede as duas
 * partes separadas enquanto o `GET` devolve a inscrição junta. A tela manda a
 * lista fechada a cada gravação, então toda inscrição já cadastrada passa por
 * aqui em todo salvamento -- inclusive as que a pessoa nem tocou.
 *
 * ⚠️ **`split` com limite de 2 partes**, e não `split("/")` cru: uma barra a
 * mais viria de escrita direta no banco, e `["263", "M", "G"]` faria a UF
 * virar `"M"` -- uma inscrição diferente, gravada em silêncio. Com o limite, a
 * sobra fica na UF e o servidor recusa, que é o desfecho alto. */
export function partesDaInscricao(inscricao: string): { numero: string; uf: string } {
  const corte = inscricao.indexOf("/");
  if (corte < 0) return { numero: inscricao, uf: "" };
  return { numero: inscricao.slice(0, corte), uf: inscricao.slice(corte + 1) };
}
