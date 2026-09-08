/** A cor de cada tom da bolinha (`Ponto`).
 *
 * 🔴 Mora no tema, como `coresDaSituacao` e `coresDoStatus`: cor é decisão de
 * tema, e um mapa de cores dentro do componente é o começo de uma segunda
 * paleta -- foi assim que `#1F9D55` e `#1c9c6b` acabaram os dois no artefato.
 *
 * ⚠️ Mapa, e não uma escada de ternários: com quatro tons a escada esconde
 * qual cor sai de qual tom.
 *
 * ⚠️ `bom` e `neutro` entraram com o menu de "Novo lançamento", onde a
 * bolinha distingue QUATRO caminhos (honorário, entrada, saída,
 * transferência) e não dois estados.
 */
export const CORES_DO_PONTO = {
  marca: "fg.brand",
  ruim: "status.bad",
  bom: "status.good",
  neutro: "fg.subtle",
} as const;
