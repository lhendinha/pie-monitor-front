import type { IntlTranslations } from "@zag-js/date-picker";

/** Os rótulos de acessibilidade do calendário, em português.
 *
 * 🔴 **O `locale="pt-BR"` NÃO cobre isto.** Ele traduz os nomes que se veem
 * (agosto, sábado); os rótulos que só o leitor de tela ouve vêm da lib e
 * nascem em inglês -- o cabeçalho dizia `"Switch to year view"` e cada dia,
 * `"Choose sábado, 1 de agosto de 2026"`. Metade da tela em outra língua,
 * para quem depende exatamente dessa metade.
 *
 * ⚠️ A interface exige as onze chaves; não dá para traduzir só as três que
 * incomodam. As que não têm equivalente melhor ficam com o texto que a lib
 * usaria, só que em português.
 *
 * ➡️ `index.test.tsx`.
 */
export const TRADUCOES_DO_CALENDARIO: IntlTranslations = {
  dayCell: (estado) => `Escolher ${estado.valueText}`,
  viewTrigger: (vista) => (vista === "day" ? "Escolher o mês" : "Escolher o ano"),
  prevTrigger: (vista) =>
    vista === "day" ? "Mês anterior" : vista === "month" ? "Ano anterior" : "Década anterior",
  nextTrigger: (vista) =>
    vista === "day" ? "Próximo mês" : vista === "month" ? "Próximo ano" : "Próxima década",
  monthSelect: "Escolher o mês",
  yearSelect: "Escolher o ano",
  presetTrigger: (valor) => `Escolher ${valor.join(" até ")}`,
  clearTrigger: "Limpar a data",
  trigger: (aberto) => (aberto ? "Fechar o calendário" : "Abrir o calendário"),
  content: "Calendário",
  placeholder: () => ({ year: "aaaa", month: "mm", day: "dd" }),
};


/** 🔴 A vista escondida tem que SUMIR.
 *
 * O Chakra marca `hidden` na vista que não é a atual, e a receita dele põe
 * `display: flex` no mesmo elemento -- que GANHA do `display: none` que o
 * navegador dá ao `[hidden]`. Resultado: dia, mês e ano empilhados na tela,
 * um embaixo do outro.
 *
 * ⚠️ **jsdom não pega isto**, e por isso o teste de unidade passava: ele lê
 * o atributo `hidden` (que está lá, correto) e não computa folha de estilo.
 * Quem prova é o Chrome -- `scripts/verificar-seletor-de-data.mjs`.
 */
export const ESCONDE_A_VISTA_INATIVA = { "&[hidden]": { display: "none" } };
