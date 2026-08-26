import { describe, expect, it } from "vitest";

import { cores } from "./tokens";
import { CORES_DO_STATUS } from "./atendimento";

/** Contraste WCAG 2.1 entre duas cores hexadecimais.
 *
 * 🔴 Este teste existe porque a régua estava escrita em COMENTÁRIO e, por
 * isso, divergia. `badDark` nasceu com o cálculo anotado no token; `good` e
 * `warn` ficaram sem gêmeo, e `Faixa` pintou texto de 13,5px/700 em 3,00:1 e
 * 3,12:1 até alguém medir. Comentário não falha no CI.
 *
 * A conta é a da especificação, não uma aproximação: luminância relativa com
 * a correção de gama do sRGB.
 */
function luminancia(hex: string): number {
  const h = hex.replace("#", "");
  const canal = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = [0, 2, 4].map((i) => canal(parseInt(h.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(a: string, b: string): number {
  const [la, lb] = [luminancia(a), luminancia(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** A régua de TEXTO PEQUENO. Vale pra tudo abaixo de 18,66px em negrito --
 * ou seja, pra toda etiqueta, selo e faixa do sistema. */
const AA_TEXTO_PEQUENO = 4.5;

/** A régua de ELEMENTO GRÁFICO: tarja, ponto, ícone. */
const AA_GRAFICO = 3;

describe("as cores de TEXTO do semáforo passam em AA sobre o próprio tint", () => {
  /* Os três pares. `bad` já passava; `good` e `warn` entraram em 26/08/2026,
     quando se mediu que o problema nunca tinha sido só do vermelho. */
  it.each([
    ["bad", cores.badDark, cores.badTint],
    ["warn", cores.warnDark, cores.warnTint],
    ["good", cores.goodDark, cores.goodTint],
  ])("%sDark sobre o tint", (_nome, texto, fundo) => {
    expect(contraste(texto, fundo)).toBeGreaterThanOrEqual(AA_TEXTO_PEQUENO);
  });

  /* Selo e número também aparecem sobre o cartão branco e sobre o fundo da
     página -- e reprovar ali seria o mesmo defeito noutro lugar. */
  it.each([
    ["badDark", cores.badDark],
    ["warnDark", cores.warnDark],
    ["goodDark", cores.goodDark],
  ])("%s sobre o cartão branco e sobre o canvas", (_nome, texto) => {
    expect(contraste(texto, cores.surface)).toBeGreaterThanOrEqual(AA_TEXTO_PEQUENO);
    expect(contraste(texto, cores.canvas)).toBeGreaterThanOrEqual(AA_TEXTO_PEQUENO);
  });
});

describe("as cores CHEIAS continuam servindo pro que são", () => {
  /* 🔴 O par negativo, e ele é o que dá sentido ao teste acima: a cor cheia
   * NÃO passa em texto pequeno. Sem afirmar isso, alguém "simplificaria" o
   * tema apagando os `*Dark` -- e o teste de cima continuaria verde se
   * apontasse pros mesmos valores.
   *
   * Elas passam em 3:1, que é a régua de elemento gráfico, e é exatamente
   * por isso que a tarja de prioridade, o ponto do cartão e os ícones seguem
   * usando a cor cheia. */
  it.each([
    ["good", cores.good, cores.goodTint],
    ["warn", cores.warn, cores.warnTint],
    ["bad", cores.bad, cores.badTint],
  ])("%s sobre o tint serve a GRÁFICO, não a texto", (_nome, cheia, tint) => {
    const razao = contraste(cheia, tint);
    expect(razao).toBeGreaterThanOrEqual(AA_GRAFICO);
    expect(razao).toBeLessThan(AA_TEXTO_PEQUENO);
  });

  it("a tarja e o ponto de prioridade passam sobre o cartão", () => {
    expect(contraste(cores.warn, cores.surface)).toBeGreaterThanOrEqual(AA_GRAFICO);
    expect(contraste(cores.bad, cores.surface)).toBeGreaterThanOrEqual(AA_GRAFICO);
  });
});

describe("os *Dark são a cor cheia ESCURECIDA, não outra cor", () => {
  it.each([
    ["bad", cores.bad, cores.badDark],
    ["warn", cores.warn, cores.warnDark],
    ["good", cores.good, cores.goodDark],
  ])("%sDark é mais escuro que %s", (_nome, cheia, escura) => {
    expect(luminancia(escura)).toBeLessThan(luminancia(cheia));
  });

  it("🔴 e guardam o MATIZ -- 'âmbar escuro' tem que continuar âmbar", () => {
    /* Sem isto, qualquer cor escura o bastante passaria nos testes de cima
       -- inclusive um cinza, que apagaria o significado da cor. A tolerância
       é de 12°, folga para o arredondamento de 8 bits por canal. */
    const matiz = (hex: string) => {
      const h = hex.replace("#", "");
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max === min) return 0;
      const d = max - min;
      const graus =
        max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return ((graus * 60) % 360 + 360) % 360;
    };

    for (const [cheia, escura] of [
      [cores.bad, cores.badDark],
      [cores.warn, cores.warnDark],
      [cores.good, cores.goodDark],
    ]) {
      const diferenca = Math.abs(matiz(cheia) - matiz(escura));
      expect(Math.min(diferenca, 360 - diferenca)).toBeLessThan(12);
    }
  });
});

describe("os status do atendimento (26/08/2026)", () => {
  it("🔴 'Em andamento' é ÂMBAR e 'Fechado' é o azul da marca", () => {
    /* A inversão do que era: azul marcava o aberto e cinza o fechado. Agora
       o âmbar é o "pede atenção" -- atendimento em curso ainda vai voltar --
       e o azul marca o resolvido. O docstring de `atendimento.ts` foi
       reescrito junto; este teste é o que impede o mapa de voltar sozinho e
       deixar a explicação mentindo. */
    expect(CORES_DO_STATUS["Em andamento"]).toEqual({
      bg: "status.warn.bg",
      color: "status.warn.text",
    });
    expect(CORES_DO_STATUS.Fechado).toEqual({
      bg: "bg.brand.subtle",
      color: "brand.darker",
    });
  });

  it("nenhum dos dois usa a cor CHEIA -- a etiqueta é 11px/800", () => {
    /* Texto pequeno pela régua do WCAG, então `.text` nos dois. Um `sed`
       distraído trocando `.text` por nada passaria em tudo menos aqui. */
    for (const status of Object.values(CORES_DO_STATUS)) {
      expect(status.color).not.toBe("status.warn");
      expect(status.color).not.toBe("status.good");
      expect(status.color).not.toBe("status.bad");
    }
  });
});
