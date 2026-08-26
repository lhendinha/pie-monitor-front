/** O que um documento pode ser, e o teto do que sobe.
 *
 * 🔴 **`TIPOS_DE_DOCUMENTO` é a lista do que esta versão SABE CRIAR, não a
 * lista do que pode existir.** O backend guarda `tipo` como string aberta,
 * de propósito -- é o que deixa o "documento padrão" entrar depois sem
 * migração. Quem LÊ um tipo desconhecido mostra o rótulo cru em vez de
 * sumir com o registro; ver `rotuloDoTipo`.
 */
export const DOCUMENTO_ARQUIVO = "arquivo";
export const DOCUMENTO_LINK = "link";

export const TIPOS_DE_DOCUMENTO = [
  { id: DOCUMENTO_ARQUIVO, rotulo: "Arquivo" },
  { id: DOCUMENTO_LINK, rotulo: "Link" },
] as const;

/** O nome de um tipo, com o cru como resposta pro que não conhecemos.
 *
 * 🔴 Um documento de tipo futuro (o "padrão", quando existir) continua
 * aparecendo na lista, rotulado pelo próprio valor. A alternativa -- devolver
 * "—" ou filtrar fora -- faria a tela ESCONDER documento que existe, e
 * esconder é pior que rotular feio.
 */
export function rotuloDoTipo(tipo: string): string {
  return TIPOS_DE_DOCUMENTO.find((t) => t.id === tipo)?.rotulo ?? tipo;
}

/** 20 MB, o mesmo teto que a política do envio manda o S3 aplicar.
 *
 * ⚠️ **A recusa que VALE é a do S3**, não esta. Aqui é conveniência: sem
 * ela, um arquivo de 300 MB sobe por minutos pra ser recusado no fim. Quem
 * decide continua sendo o servidor -- mesmo espírito de `limites.ts`.
 */
export const TAMANHO_MAXIMO_DE_ARQUIVO = 20 * 1024 * 1024;

/** "1,4 MB", "312 KB". Base 1024, como o teto acima e como o sistema
 * operacional que a pessoa vai usar pra conferir o arquivo baixado. */
export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  // Uma casa só: "1,4 MB" basta pra dimensionar, e "1,43 MB" sugere uma
  // precisão que ninguém usa.
  return `${mb.toFixed(1).replace(".", ",")} MB`;
}
