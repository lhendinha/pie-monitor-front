/** Cor da prioridade: a tarja à esquerda do cartão e o ponto no rodapé.
 *
 * Vermelho, âmbar e cinza -- a mesma escala de urgência do resto do
 * sistema. Baixa é cinza de propósito: prioridade baixa não deve competir
 * por atenção num quadro cheio. */
export const CORES_DA_PRIORIDADE: Record<string, string> = {
  Alta: "status.bad",
  Média: "status.warn",
  Baixa: "fg.subtle",
};

export const PRIORIDADES = ["Baixa", "Média", "Alta"] as const;

/** Os períodos da barra de filtro.
 *
 * ⚠️ "Todos os períodos" é `null`, NUNCA a string "todos": o artifact anota
 * isso porque já foi bug lá -- a string virava um filtro de verdade e
 * escondia tudo. */
export const PERIODOS = [
  { id: "todos", rotulo: "Todos os períodos", dias: null },
  { id: "hoje", rotulo: "Hoje", dias: 0 },
  { id: "semana", rotulo: "Esta semana", dias: 7 },
  { id: "mes", rotulo: "Este mês", dias: 30 },
] as const;
