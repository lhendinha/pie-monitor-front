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

// Os períodos do filtro saíram daqui pra `src/constants/periodos.ts`: o
// artifact usa a mesma lista no Kanban e na Agenda, e a conversão em datas
// virou `utils/periodo.ts`.
