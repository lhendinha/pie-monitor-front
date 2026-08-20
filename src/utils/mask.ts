/** Remove tudo que não é dígito, limitado a 20 caracteres (padrão CNJ). */
export function apenasDigitos(valor: string | null | undefined): string {
  return (valor || "").replace(/\D/g, "").slice(0, 20);
}

/**
 * Aplica a máscara CNJ progressivamente, conforme o usuário digita:
 * NNNNNNN-DD.AAAA.J.TR.OOOO
 */
export function mascararNumeroProcesso(valorComOuSemMascara: string | null | undefined): string {
  const d = apenasDigitos(valorComOuSemMascara);
  let out = d.slice(0, 7);
  if (d.length > 7) out += "-" + d.slice(7, 9);
  if (d.length > 9) out += "." + d.slice(9, 13);
  if (d.length > 13) out += "." + d.slice(13, 14);
  if (d.length > 14) out += "." + d.slice(14, 16);
  if (d.length > 16) out += "." + d.slice(16, 20);
  return out;
}

/**
 * Alterna CPF (000.000.000-00, até 11 dígitos) e CNPJ (00.000.000/0000-00,
 * 12-14 dígitos) conforme a contagem de dígitos digitados.
 */
export function mascararCpfCnpj(valorComOuSemMascara: string | null | undefined): string {
  const d = apenasDigitos(valorComOuSemMascara).slice(0, 14);
  if (d.length <= 11) {
    let out = d.slice(0, 3);
    if (d.length > 3) out += "." + d.slice(3, 6);
    if (d.length > 6) out += "." + d.slice(6, 9);
    if (d.length > 9) out += "-" + d.slice(9, 11);
    return out;
  }
  let out = d.slice(0, 2) + "." + d.slice(2, 5) + "." + d.slice(5, 8) + "/" + d.slice(8, 12);
  if (d.length > 12) out += "-" + d.slice(12, 14);
  return out;
}

/**
 * (00) 0000-0000 (fixo, 10 dígitos) ou (00) 00000-0000 (celular, 11
 * dígitos), progressivo conforme a pessoa digita. Achado 17: o prefixo do
 * meio só vira 5 dígitos a partir do 9º dígito depois do DDD -- até lá,
 * assume fixo (4 dígitos). Mesmo "reflow ao digitar o 9º dígito" usado pela
 * maioria das máscaras de telefone BR.
 */
export function mascararTelefone(valorComOuSemMascara: string | null | undefined): string {
  const d = apenasDigitos(valorComOuSemMascara).slice(0, 11);
  let out = d.slice(0, 2);
  if (d.length >= 2) out = `(${out})`;
  if (d.length <= 2) return out;
  const prefixoTamanho = d.length > 10 ? 5 : 4;
  out += " " + d.slice(2, 2 + prefixoTamanho);
  if (d.length > 2 + prefixoTamanho) out += "-" + d.slice(2 + prefixoTamanho, 11);
  return out;
}
