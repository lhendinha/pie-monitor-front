import { describe, expect, it } from "vitest";

/** O padrão: asterisco vermelho no obrigatório, e NADA no opcional.
 *
 * 🔴 Antes de 01/09/2026 o app dizia as duas coisas ao mesmo tempo. Oito
 * rótulos traziam "(opcional)" enquanto os outros 51 campos dispensáveis não
 * traziam nada -- então a ausência do texto não significava nada, e um campo
 * calado ao lado de um "(opcional)" lia como obrigatório. O asterisco do
 * `Campo` já dizia o que precisava ser dito; o "(opcional)" era um segundo
 * vocabulário para a mesma pergunta.
 *
 * ⚠️ **Metade mecânica só.** Este guarda cobra a ausência do texto, que é
 * automatizável. A outra metade -- todo campo que TRAVA o envio ter o
 * asterisco -- depende de ler a lógica de cada formulário, e é conferência
 * humana. Três telas ficaram deliberadamente SEM asterisco mesmo tendo campo
 * exigido (`LoginPage`, `EsqueciSenhaPage`, `ModalDoQuadro`): lá não há campo
 * dispensável ao lado, e marcar tudo não separa nada. A razão está escrita em
 * cada uma delas.
 *
 * ⚠️ **"Opcional." sem parênteses continua legítimo** -- é o texto de apoio
 * embaixo do campo de vínculo ("Opcional. Dá pra vincular um processo, um
 * atendimento, ou os dois."), que explica o que o campo FAZ, e não repete o
 * que o asterisco já diz.
 */

const COMENTARIO_DE_LINHA = /\/\/[^\n]*/g;
const COMENTARIO_DE_BLOCO = /\/\*[\s\S]*?\*\//g;

/** O texto aposentado. Com parênteses: é assim que ele aparecia em rótulo. */
const APOSENTADO = "(opcional)";

const FONTES = Object.entries(
  import.meta.glob("/src/**/*.tsx", { query: "?raw", import: "default", eager: true }),
).filter(([caminho]) => !caminho.includes(".test.")) as [string, string][];

/** Comentário pode citar o texto antigo -- é história, e history não é tela. */
const semComentarios = (fonte: string) =>
  fonte.replace(COMENTARIO_DE_BLOCO, "").replace(COMENTARIO_DE_LINHA, "");

describe("nenhum rótulo diz \"(opcional)\"", () => {
  it("o guarda achou as fontes -- senão passaria vazio", () => {
    expect(FONTES.length).toBeGreaterThan(50);
    expect(FONTES.some(([, fonte]) => fonte.includes("rotulo="))).toBe(true);
  });

  it("e ainda enxerga o texto quando ele existe -- senão o filtro comeria tudo", () => {
    expect(semComentarios('<Campo rotulo="X (opcional)">')).toContain(APOSENTADO);
  });

  it("nenhuma tela traz o texto aposentado", () => {
    const culpados = FONTES.filter(([, fonte]) => semComentarios(fonte).includes(APOSENTADO)).map(
      ([caminho]) => caminho,
    );

    expect(culpados).toEqual([]);
  });
});
