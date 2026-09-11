/** Valor que o servidor entende não se escreve à mão duas vezes.
 *
 * 🔴 O defeito que este guarda existe para impedir é o mesmo do backend
 * (`api/CONTEXT.md`, seção 0c): a palavra funciona hoje e some em silêncio
 * no dia em que mudar, porque a comparação continua válida e só passa a ser
 * sempre falsa. Aqui a versão dele é pior de achar, porque some numa tela:
 * o card conta 7 e a lista abre vazia.
 *
 * ⚠️ **No front o TypeScript já pega parte disso** -- `minimo: Papel` ou
 * `tipo_envio?: "movimentacao" | "lembrete"` recusam a palavra errada na
 * compilação. O que ele NÃO pega, e este guarda pega, é a palavra repetida
 * onde o tipo é `string` livre: chave de `Record<string, ...>`, `state` de
 * navegação, valor de opção de menu.
 *
 * ⚠️ Só entra aqui palavra DISTINTIVA. "todos", "eu" e "nome" são comuns
 * demais para varrer por valor -- para essas o guarda seria ruído, e ruído
 * vira teste silenciado.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  ESTADO_DO_ALVO_EXCLUIDO,
  ESTADO_DO_ALVO_SEM_ACESSO,
  STATUS_EM_ANDAMENTO,
  STATUS_FECHADO,
  TIPO_ENVIO_LEMBRETE,
  TIPO_ENVIO_MOVIMENTACAO,
} from "./constants";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SRC = AQUI;

/** O valor sai da CONSTANTE, nunca escrito de novo aqui -- repetir a palavra
 * no teste seria mais uma cópia solta do que ele proíbe. */
const VOCABULARIO: Record<string, string> = {
  [STATUS_EM_ANDAMENTO]: "STATUS_EM_ANDAMENTO (constants/atendimento)",
  [STATUS_FECHADO]: "STATUS_FECHADO (constants/atendimento)",
  [TIPO_ENVIO_MOVIMENTACAO]: "TIPO_ENVIO_MOVIMENTACAO (constants/historico)",
  [TIPO_ENVIO_LEMBRETE]: "TIPO_ENVIO_LEMBRETE (constants/historico)",
  [ESTADO_DO_ALVO_EXCLUIDO]: "ESTADO_DO_ALVO_EXCLUIDO (constants/notificacoes)",
  [ESTADO_DO_ALVO_SEM_ACESSO]: "ESTADO_DO_ALVO_SEM_ACESSO (constants/notificacoes)",
};

/** `arquivo|valor` -> por que aquele literal PODE ficar.
 *
 * 🔴 Toda isenção diz o motivo, e um teste apaga a que sobrou: isenção órfã
 * é guarda desligado que ninguém percebe. */
const ISENCOES: Record<string, string> = {
  "constants/atendimento.ts|Em andamento": "é a declaração da constante",
  "constants/atendimento.ts|Fechado": "é a declaração da constante",
  "constants/historico.ts|movimentacao": "é a declaração da constante",
  "constants/historico.ts|lembrete": "é a declaração da constante",
  "constants/notificacoes.ts|excluido": "é a declaração da constante",
  "constants/notificacoes.ts|sem_acesso": "é a declaração da constante",
  "constants/notificacoes.ts|lembrete":
    "TIPO_LEMBRETE é o vocabulário do SINO, outro domínio com a mesma palavra",
  "types/processo.ts|movimentacao": "union type não aceita variável, como o Literal do Python",
  "types/processo.ts|lembrete": "union type não aceita variável",
  "pages/AtendimentosPage/constants.ts|Em andamento":
    "`rotulo` é texto de tela, ao lado do `id` que usa a constante -- de propósito",
  "theme/atendimento.ts|Em andamento": "prosa do comentário que explica a cor",
  "theme/atendimento.ts|Fechado": "prosa do comentário que explica a cor",
  "theme/index.ts|Em andamento": "prosa do comentário sobre contraste",
  "pages/AtendimentosPage/constants.ts|Fechado":
    "prosa do comentário que explica por que o vocabulário mora em constants/",
  "pages/HistoricoPage/types.ts|movimentacao":
    "prosa do comentário que explica o state da navegação",
  "pages/WorkspacePage/components/ResumoRapido/index.tsx|Em andamento":
    "prosa do comentário que explica o acoplamento entre páginas",
};

function arvore(raiz: string): string[] {
  const fora: string[] = [];
  for (const nome of fs.readdirSync(raiz)) {
    const abs = path.join(raiz, nome);
    if (fs.statSync(abs).isDirectory()) fora.push(...arvore(abs));
    else if (/\.(ts|tsx)$/.test(nome) && !/\.test\./.test(nome)) fora.push(abs);
  }
  return fora;
}

const FONTES = arvore(SRC);

/** Onde cada palavra do vocabulário aparece entre aspas. */
function achados(): string[] {
  const ruins: string[] = [];
  for (const abs of FONTES) {
    const relativo = path.relative(SRC, abs);
    const linhas = fs.readFileSync(abs, "utf8").split("\n");
    for (const [valor, dono] of Object.entries(VOCABULARIO)) {
      if (ISENCOES[`${relativo}|${valor}`]) continue;
      linhas.forEach((linha, i) => {
        if (linha.includes(`"${valor}"`) || linha.includes(`'${valor}'`)) {
          ruins.push(`${relativo}:${i + 1} -- ${dono} escrita à mão: ${linha.trim().slice(0, 70)}`);
        }
      });
    }
  }
  return ruins;
}

describe("constante nunca vira string solta", () => {
  it("o vocabulário do servidor sai sempre da constante", () => {
    expect(FONTES.length).toBeGreaterThan(300);
    expect(achados()).toEqual([]);
  });

  it("toda isenção ainda isenta alguma coisa", () => {
    for (const [chave, motivo] of Object.entries(ISENCOES)) {
      const [relativo, valor] = chave.split("|");
      const abs = path.join(SRC, relativo);
      expect(fs.existsSync(abs), `isenção aponta para arquivo que sumiu: ${relativo}`).toBe(true);
      const texto = fs.readFileSync(abs, "utf8");
      expect(
        texto.includes(`"${valor}"`) || texto.includes(`'${valor}'`) || texto.includes(valor),
        `a isenção de ${chave} (${motivo}) já não é necessária -- apague`,
      ).toBe(true);
    }
  });

  it("o guarda pega o defeito que ele existe para pegar", () => {
    // O par negativo: sem isto, um guarda que nunca acusa passaria igual.
    const forjado = `const x = "${STATUS_EM_ANDAMENTO}";`;
    expect(forjado.includes(`"${STATUS_EM_ANDAMENTO}"`)).toBe(true);
    expect(Object.keys(VOCABULARIO)).toContain(STATUS_EM_ANDAMENTO);
    expect(Object.keys(VOCABULARIO).every((v) => v.length > 4)).toBe(true);
  });
});
