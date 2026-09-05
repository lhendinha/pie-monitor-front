import type { CamposOpcionaisProcesso } from "../../../../types";

export interface CamposProcessoProps {
  valores: CamposOpcionaisProcesso;
  onMudar: (valores: CamposOpcionaisProcesso) => void;
  /** Nome de cada id em `valores.clienteIds`, na MESMA ordem -- é o
   * `cliente_nomes` que a resposta do processo já traz.
   *
   * Prop separada, e não um campo de `CamposOpcionaisProcesso`, porque
   * aquele tipo é o CORPO da requisição de salvar: um nome ali seria
   * mandado de volta ao servidor como se fosse dado a gravar. Aqui ele só
   * serve pra etiqueta na tela de EDIÇÃO -- no cadastro não existe nada
   * escolhido ainda. */
  nomesDosClientes?: string[];
  /** De qual subgrupo saem as opções de responsável.
   *
   * 🔴 Vem de FORA porque este componente nunca soube o subgrupo, e as duas
   * telas o conhecem por caminhos diferentes: na edição ele vem do processo;
   * na criação, de um seletor que vive no `NovoProcessoForm` -- fora daqui.
   *
   * Sem ele o campo de responsável listaria as pessoas erradas, ou nenhuma. */
  subgrupoId: string;
  /** Apelido de cada e-mail em `valores.responsaveis`, na MESMA ordem. */
  nomesDosResponsaveis?: string[];
}
