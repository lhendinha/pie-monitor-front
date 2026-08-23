/** Um aviso na fila. O tipo mora fora do provider porque o `Aviso` também
 * precisa dele, e um importar do outro criaria ciclo. */
export interface ToastItem {
  id: number;
  tipo: "erro" | "sucesso";
  mensagem: string;
}
