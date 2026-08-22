/** Ícones custom em SVG -- usados nos botões de ação junto com os glifos de
 * texto (✎/✕), pra quando não há um caractere Unicode que capture bem o
 * significado. Herdam a cor via `currentColor`, então acompanham o hover
 * normal do `.icon-btn` igual aos glifos de texto. Um arquivo por ícone,
 * re-exportados aqui -- mesmo padrão de pasta usado pelos outros
 * componentes em `src/components`. */

export { default as IconeHistorico } from "./IconeHistorico";
export { default as IconeArrastar } from "./IconeArrastar";

// Ícones do menu lateral (Fase 2). `IconeHistorico` acima já servia.
export { default as IconeWorkspace } from "./IconeWorkspace";
export { default as IconeKanban } from "./IconeKanban";
export { default as IconeAgenda } from "./IconeAgenda";
export { default as IconeAtendimentos } from "./IconeAtendimentos";
export { default as IconeProcessos } from "./IconeProcessos";
export { default as IconeClientes } from "./IconeClientes";
export { default as IconeGrupo } from "./IconeGrupo";
