import { chromium } from "playwright";
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await c.newPage();
await p.goto("file://" + process.env.ARTIFACT, { waitUntil: "networkidle" });
await p.evaluate(() => window.goTo && window.goTo("processos"));
await p.waitForTimeout(300);
await p.click("#proc-situacao-filter");
await p.waitForTimeout(300);
console.log(JSON.stringify(await p.evaluate(() => {
  const painel = document.querySelector("#proc-situacao-panel");
  const todas = painel.querySelector(".period-opt");
  const div = painel.querySelector(".period-div");
  const lab = painel.querySelector(".filter-radio");
  const acoes = painel.querySelector(".filter-actions");
  const m = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), padding: cs.padding,
      fontSize: cs.fontSize, fontWeight: cs.fontWeight, color: cs.color,
      background: cs.backgroundColor, borderRadius: cs.borderRadius, gap: cs.gap,
      borderTop: cs.borderTop, margin: cs.margin };
  };
  return { painel: m(painel), todasAsOpcoes: m(todas), divisoria: m(div), linha: m(lab), acoes: m(acoes),
           scroll: painel.querySelector("[style*='max-height']")?.getAttribute("style") };
}), null, 1));
await b.close();
