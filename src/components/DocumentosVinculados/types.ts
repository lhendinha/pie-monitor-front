import type { Vinculo } from "../../types";

export interface DocumentosVinculadosProps {
  /** UM filtro por vez -- é como as três abas o usam, e é o que a rota faz
   * de melhor: cada campo a mais estreita a mesma varredura. */
  filtro: { processoNumero?: string; atendimentoId?: string; clienteId?: string };
  /** Subgrupo em que o modal de criação abre.
   *
   * ⚠️ Ausente na aba do CLIENTE, e não por esquecimento: cliente é do
   * GRUPO, não de um subgrupo, então não há qual oferecer. Lá o modal cai no
   * primeiro subgrupo da lista, como em qualquer criação sem contexto. */
  subgrupoInicial?: string;
  /** O vínculo já preenchido no modal, COM o rótulo que a pessoa reconhece
   * -- o número mascarado do processo, o assunto do atendimento. Sem ele o
   * modal mostraria o id cru na etiqueta. */
  vinculoInicial?: Vinculo | null;
  clienteInicial?: { id: string; nome: string } | null;
  /** A frase do vazio. Nomeia a coisa ("…a este processo"): "Nenhum
   * documento" sozinho não diz se a lista está vazia ou filtrada. */
  vazio: string;
}
