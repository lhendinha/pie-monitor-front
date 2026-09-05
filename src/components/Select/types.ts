import type { OpcaoDeSelect } from "../../types";

/** O que `useBuscaDoPainel` devolve: o termo digitado no painel do select,
 * a lista que ele mostra e quantos ficaram de fora. */
export interface EstadoDaBuscaDoPainel {
  busca: string;
  mudarBusca: (termo: string) => void;
  /** O que o react-select recebe: a lista já filtrada, no caso local; a
   * lista que o pai trouxe, no remoto. */
  opcoesVisiveis: OpcaoDeSelect[];
  /** Quantos casaram com o termo mas não couberam no teto. Zero na imensa
   * maioria das vezes; quando não é, o painel PRECISA dizer. */
  ocultos: number;
}

export interface CampoDeBuscaDoPainelProps {
  valor: string;
  onMudar: (valor: string) => void;
  placeholder: string;
  onEscape: () => void;
}

/** Props que o `Select`/`MultiSelect` na variante "chip" injeta via
 * `selectProps` pra este menu -- é o caminho que o react-select oferece pra
 * passar dado do componente pai pros componentes customizados. */
export interface ExtrasDoMenu {
  rotuloTodas: string;
  nenhumSelecionado: boolean;
  onTodas: () => void;
  /** Desliga a linha "Todas as X" do topo.
   *
   * Pro seletor de SUBGRUPO do quadro e da agenda: lá a pílula não filtra,
   * escolhe QUAL quadro a tela mostra -- e "todos os subgrupos" não é um
   * quadro que exista. A linha prometeria uma tela que não há. */
  comOpcaoTodas?: boolean;
  /** Ausentes no filtro de valor único (cliente): lá escolher já aplica, e
   * o artifact não desenha rodapé nenhum nesse painel. */
  onCancelar?: () => void;
  onAplicar?: () => void;
  /** O que a pessoa digitou, e por onde ele muda. Ausentes nas pílulas de
   * lista curta e fechada, onde digitar não ajudaria. */
  busca?: string;
  onBusca?: (termo: string) => void;
  placeholderBusca?: string;
  /** Já HÁ lista na tela e outra está a caminho -- esmaece e avisa, em vez
   * de esvaziar. */
  buscando?: boolean;
  /** Quantos resultados casaram mas não couberam no teto da lista. */
  ocultos?: number;
  /** A busca no servidor falhou. */
  erro?: boolean;
  onTentarDeNovo?: () => void;
  onFechar?: () => void;
}

export interface MultiSelectProps {
  id?: string;
  opcoes: OpcaoDeSelect[];
  selecionados: string[];
  onMudar: (valores: string[]) => void;
  placeholder?: string;
  /** "chip" desenha o controle como a pílula de filtro do artifact.
   *
   * O rótulo mostra a seleção -- é o `ResumoSelecionados` (ValueContainer
   * já existente no projeto) que troca as tags padrão por texto: um nome
   * quando é um só, "N selecionados" quando são muitos. É por isso que o
   * artifact não precisa de chips removíveis embaixo da barra. */
  variante?: "padrao" | "chip";
  /** As opções ainda estão vindo.
   *
   * Lista vazia significa duas coisas -- "não existe nenhuma" e "ainda não
   * chegou" -- e um seletor vazio e clicável faz a pessoa concluir a
   * primeira. Aqui ele fica travado e o texto diz o que está acontecendo,
   * em vez de mentir por omissão.
   *
   * ⚠️ Com `onBuscar` o controle NÃO é travado: ali é ABRIR que dispara a
   * busca, e uma pílula travada enquanto carrega nunca sairia do lugar. */
  carregando?: boolean;
  /** Ver `Select`: digitar para filtrar, **ligado por padrão**. */
  permitirBusca?: boolean;
  /** Ver `Select`: idem, mas quem filtra é o SERVIDOR -- pra lista que pode
   * crescer sem limite (cliente, subgrupo, pessoa). */
  onBuscar?: (termo: string) => void;
  placeholderBusca?: string;
  erro?: boolean;
  onTentarDeNovo?: () => void;
  /** O X que limpa sem abrir o painel.
   *
   * ⚠️ Aqui ele NÃO passa pelo rascunho: limpar tudo é a única ação do
   * painel que se aplica sozinha. Exigir "Aplicar" depois de um botão que
   * diz "limpar" seria pedir confirmação de um gesto que já é explícito --
   * e ele existe justamente pra não ter que abrir o painel. */
  permitirLimpar?: boolean;
  /** Não dá para mexer AGORA -- uma gravação desta linha está em voo.
   *
   * 🔴 Separado de `carregando`, e não reusando aquele: `carregando` troca o
   * placeholder por "Carregando…", que seria mentira durante um salvamento.
   * Dois estados diferentes com a mesma prop é como a tela passa a informar
   * errado sem nada ficar vermelho.
   *
   * ⚠️ Espelha o `desabilitado` que o `Select` de valor único já tem: a
   * ausência dele aqui era assimetria, não decisão. */
  desabilitado?: boolean;
}

/** Extras que `MultiSelect`/`Select` passam por `selectProps` -- o caminho
 * que o react-select oferece pra levar dado até um componente substituído.
 * Mesmo padrão de `MenuDeFiltro`. */
export interface ExtrasDoResumo {
  ehPilula?: boolean;
}

export interface SelectProps {
  id?: string;
  opcoes: OpcaoDeSelect[];
  valor: string;
  onMudar: (valor: string) => void;
  placeholder?: string;
  /** Ver `MultiSelect` -- mesma variante, pro filtro de valor único.
   *
   * Aqui o painel NÃO tem rodapé: escolher já aplica, porque com valor
   * único não existe "montar uma seleção" pra confirmar depois. O
   * `placeholder` vira a linha "Todos os X" no topo, que é como o artifact
   * oferece o "sem filtro" -- por isso a lista de opções não precisa (nem
   * deve) trazer uma opção de valor vazio. */
  variante?: "padrao" | "chip";
  compacto?: boolean;
  /** Largura fixa quando o contexto exige (72px no "Por página" do
   * artifact). Sem ela o controle acompanha o container. */
  largura?: string;
  /** Campo que existe pra ser LIDO, não escolhido -- o subgrupo de uma
   * tarefa já criada, por exemplo, que faz parte da chave e não muda.
   * Mostrar desabilitado diz onde a coisa está; esconder deixaria a pessoa
   * sem saber. */
  desabilitado?: boolean;
  /** As opções ainda estão vindo.
   *
   * Trava o controle e troca o texto por "Carregando…". Sem isto, um select
   * de lista vazia é indistinguível de "não há nenhuma opção" -- e o de
   * Fase/Situação chega a oferecer só "Nenhuma", que é uma resposta errada
   * enquanto a lista não chegou.
   *
   * A mensagem é genérica de propósito: enumerar o que está vindo obriga a
   * reescrever a frase toda vez que a tela ganha outra consulta.
   *
   * ⚠️ Com `onBuscar` o controle NÃO é travado: ali é ABRIR que dispara a
   * busca, e uma pílula travada enquanto carrega nunca sairia do lugar. */
  carregando?: boolean;
  /** Digitar para filtrar. **Ligado por padrão** (28/08/2026): é o
   * comportamento esperado de qualquer seletor do sistema, e listas curtas
   * hoje crescem amanhã -- fase e situação são cadastráveis, subgrupo e
   * pessoa também.
   *
   * ⚠️ Onde a lista é FECHADA e minúscula (papel, tamanho de página,
   * prioridade), a caixa de digitar não atrapalha: ela filtra o que já está
   * ali e não cobra nada de quem prefere clicar.
   *
   * ⚠️ Desligue com `permitirBusca={false}` só quando digitar não puder
   * ajudar -- e escreva o porquê no lugar. */
  permitirBusca?: boolean;
  /** Idem, mas quem filtra é o SERVIDOR -- pra lista que pode crescer sem
   * limite (cliente, subgrupo, pessoa). Recebe o termo já com espera entre
   * teclas; o pai devolve a próxima lista em `opcoes`. */
  onBuscar?: (termo: string) => void;
  placeholderBusca?: string;
  /** A busca falhou. O painel troca a lista pela falha e por "Tentar de
   * novo" -- ver `FalhaDoPainel`. */
  erro?: boolean;
  onTentarDeNovo?: () => void;
  /** O X que limpa sem abrir o painel. */
  permitirLimpar?: boolean;
  /** Ver `ExtrasDoMenu.comOpcaoTodas` -- desliga a linha "Todas as X" pro
   * seletor que ESCOLHE em vez de filtrar. */
  comOpcaoTodas?: boolean;
}
