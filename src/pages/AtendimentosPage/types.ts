/** O processo escolhido: o número que vai pro servidor e o rótulo já
 * mascarado que a etiqueta mostra. Guardar os dois evita mascarar de novo a
 * cada render -- e o rótulo continua certo mesmo depois de a busca sumir. */
export interface ProcessoEscolhido {
  numero: string;
  rotulo: string;
}
