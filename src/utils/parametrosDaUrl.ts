import type { ValorDaUrl } from "../types";

/* 🔴 Mora em `utils/`, e não no arquivo do hook: é conversão entre a query
   string e os tipos do sistema -- não tem React dentro, e se testa sozinha.
   Gêmeo de `corpoDosCamposDeProcesso`, que também é tradução de formato. */

/** Lê da query string com o TIPO do valor inicial -- é ele quem diz como
 * decodificar. Ausente devolve o inicial. */
export function lerParametroDaUrl<T extends ValorDaUrl>(params: URLSearchParams, chave: string, inicial: T): T {
  if (Array.isArray(inicial)) return params.getAll(chave) as T;

  const cru = params.get(chave);
  if (cru === null) return inicial;

  if (typeof inicial === "number") {
    const n = Number(cru);
    /* ⚠️ INTEIRO, e nada além disso. A URL é editável à mão e chega colada de
       qualquer lugar: `?pagina=abc` e `?pagina=1.5` caem no padrão em vez de
       virarem `NaN` ou fração (que o servidor recusa com 422, e a tela leria
       como falha do sistema).

       🔴 A FAIXA não mora aqui. Tentei "inteiro >= 1" e quebrei o filtro
       `dias` do Histórico, cujo valor neutro é 0: quem sabe o intervalo
       válido é quem declara o estado -- ver `usePaginacaoDaLista`. */
    return (Number.isInteger(n) ? n : inicial) as T;
  }
  if (typeof inicial === "boolean") return (cru === "1") as T;
  return cru as T;
}

/** Escreve o valor na query string.
 *
 * ⚠️ Escreve SEMPRE -- decidir o que "não vale a pena" escrever é de quem
 * declarou o estado, que é o único a saber qual é o padrão dele. Foi essa
 * decisão vazando para cá que fez "Todos" voltar para "Movimentações" e o
 * filtro de falha não desligar. */
export function escreverParametroDaUrl<T extends ValorDaUrl>(
  params: URLSearchParams,
  chave: string,
  valor: T,
): void {
  params.delete(chave);

  if (Array.isArray(valor)) {
    valor.forEach((v) => params.append(chave, v));
    return;
  }
  /* 🔴 Booleano escreve os DOIS estados (`1`/`0`), e não só o verdadeiro.
     "Só quando é true" parece economia e não é: um filtro que ABRE ligado
     (o link "só com falha" da Área de trabalho) não conseguia ser desligado
     -- `false` sumia da URL, e o que some volta como o padrão, que ali era
     `true`. O botão "limpar filtros" não limpava. */
  if (typeof valor === "boolean") {
    params.set(chave, valor ? "1" : "0");
    return;
  }
  params.set(chave, String(valor));
}
