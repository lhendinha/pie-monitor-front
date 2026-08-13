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
