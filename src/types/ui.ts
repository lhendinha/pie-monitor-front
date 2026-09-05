/** Vocabulário de tela que não tem dono: select, menu, navegação, botão. */
import type { Papel } from "./sessao";

/** Qualquer item ordenável: uma opção de Fase/Situação ou uma coluna do
 * quadro. `calcularOrdemAposMover` só precisa da `ordem`, e pedir a
 * entidade inteira prenderia o helper a uma delas. */
export interface ComOrdem {
  ordem: number;
}

// Tipos que estavam espalhados
//
// Todos vinham declarados dentro do módulo que os usava primeiro --
// `utils/`, `constants/`, `theme/`, `components/`, `services/`. Enquanto o
// consumidor era um só isso não incomodava; quando passou a ser vários, o
// import cruzava a casa inteira (o `ToastItem` vivia num arquivo dentro de
// `components/Toast/` e era importado de dentro de `pages/`) e a resposta
// pra "onde declaro este tipo?" passou a depender de quem chegou primeiro,
// não do alcance dele.
//
// ⚠️ Tipo PRIVADO de uma página continua no `types.ts` dela -- o critério é
// alcance, não arquivo. O que mora aqui é o que atravessa fronteira.

/** Um item do menu lateral. `minimo` é o papel a partir do qual ele APARECE
 * -- não é permissão: a rota continua acessível por link direto, e quem
 * decide o que a pessoa pode fazer é sempre o backend. */
export interface ItemNavegacao {
  caminho: string;
  rotulo: string;
  /** Nome do ícone em `components/Icons` (sem o prefixo `Icone`). */
  icone: string;
  minimo?: Papel;
  /** Tela ainda não construída. O item fica FORA do menu enquanto for true --
   * item que leva a tela vazia é pior que item ausente. Some junto com a
   * etapa que entrega a tela; a lista já está na ordem final de propósito,
   * pra que a navegação não mude de forma a cada entrega. */
  pendente?: boolean;
}

/** Uma opção de menu de escolha única -- o filtro de período e a
 * `PilulaDeMenu` usam a mesma forma.
 *
 * Chamava-se `OpcaoDePeriodo` e vivia em `constants/periodos.ts`. O nome
 * descrevia o primeiro uso, não a forma, e por isso a `PilulaDeMenu` tinha
 * uma cópia local idêntica -- com o mesmo comentário sobre o zag, copiado
 * junto. Não confundir com `OpcaoDeSelect` (`{value, label}`), que é o que
 * o react-select consome. */
export interface OpcaoDeMenu {
  /** Não pode ser vazio: item de menu com `value=""` o zag não registra, e
   * a opção simplesmente não seleciona. */
  id: string;
  rotulo: string;
}

/** Uma opção de `Select`/`MultiSelect`. */
export interface OpcaoDeSelect {
  value: string;
  label: string;
}

/** Como cada opção do painel se desenha: caixa de seleção quando dá pra
 * escolher várias (situação, fase) e linha inteira clicável quando é uma só
 * (cliente). */
export type FormaDaOpcaoDeSelect = "caixa" | "linha";

/** As variantes de `.btn` do artifact que o sistema usa de fato. */
export type VarianteBotao = "primario" | "ghost" | "perigo" | "perigoContorno";

/** O que o `Modal` faz quando alguém tenta fechá-lo.
 *
 * 🔴 **Obrigatória de propósito, e não opcional com padrão seguro.** A
 * assimetria decide: esquecer a guarda perde o trabalho digitado de alguém em
 * silêncio, sem rastro; esquecer o `"semFormulario"` é erro de compilação
 * antes do commit. Um `descarte?:` opcional faria o modal criado daqui a seis
 * meses nascer desprotegido, e ninguém descobriria até o primeiro relato de
 * "sumiu tudo".
 *
 * ⚠️ Ela governa só os GESTOS de fechar (Escape, cortina, X, Cancelar).
 * Fechamento programático -- o `onFechar()` que o próprio formulário chama
 * depois de salvar -- passa direto, e tem de passar: perguntar "sair sem
 * salvar?" logo depois de um "salvo com sucesso" seria absurdo.
 */
export type Descarte =
  | "semFormulario"
  | {
      mudou: boolean;
      /** Muda a frase da perda e o rótulo de voltar. Padrão: `"edicao"`. */
      caso?: "edicao" | "criacao";
      /** 🔴 Só para os modais que salvam NA HORA (`ModalDoQuadro`,
       * `MembrosDoSubgrupo`), onde as frases padrão mentiriam: ali colunas e
       * membros já foram gravados, e o que se perde é só o texto digitado e
       * não commitado. */
      textoProprio?: {
        titulo: string;
        mensagem: string;
        sair: string;
        voltar: string;
      };
    };

/** Um valor projetado de formulário, para a guarda de descarte comparar.
 *
 * 🔴 **A ausência de objeto aninhado é a decisão, não um descuido.** Quem
 * precisa comparar `endereco` ou `vinculos` inteiros leva erro de compilação e
 * é obrigado a projetar campo a campo (`...endereco`,
 * `processoId: vinculos.processo?.id ?? null`). A alternativa seria um
 * deep-equal, e um deep-equal frágil deixaria o formulário "alterado" para
 * sempre por desigualdade de referência -- defeito que ninguém percebe até
 * alguém não conseguir mais fechar um modal.
 *
 * ⚠️ `File` entra na lista e é comparado por IDENTIDADE, como qualquer
 * primitivo: o que se quer saber é "tem arquivo ou não", e escolher o mesmo
 * arquivo de novo gera instância nova mas dá o mesmo veredito.
 */
export type ValorDeFormulario =
  | string
  | number
  | boolean
  | null
  | undefined
  | File
  | readonly (string | number)[];

/** O que uma pílula de filtro precisa receber pra se completar por busca. */
export interface OpcoesBuscaveis {
  /** O que a PÍLULA mostra: a primeira página, ou o resultado da busca em
   * curso. Encolhe conforme a pessoa digita. */
  opcoes: OpcaoDeSelect[];
  /** A primeira página, SEM busca -- o que a página deve usar pra tudo que
   * não é a lista da pílula: escolher o quadro padrão, saber se existe algum
   * subgrupo, decidir se o botão de criar fica habilitado.
   *
   * 🔴 Separado de `opcoes` porque digitar é da PÍLULA, e a página lia a
   * mesma lista. Três defeitos saíram disso, todos reproduzidos em Chrome:
   * buscar "zzz" e fechar sem escolher desabilitava o "Nova tarefa" da
   * Agenda (a página passava a achar que não existe subgrupo nenhum); o
   * quadro do Kanban podia trocar sozinho enquanto se digitava; e a Agenda
   * passava a considerar só os subgrupos que casavam com o termo.
   *
   * ⚠️ Só é preenchida com `sempreLigada`. Nas pílulas preguiçosas nada na
   * página deriva da lista -- se derivasse, a página dependeria de alguém
   * abrir o filtro. */
  primeiraPagina: OpcaoDeSelect[];
  /** Uma busca está em voo. Serve pro PAINEL (esmaecer a lista, mostrar a
   * faixa) -- e não pra tela, que não pode piscar a cada tecla. */
  carregando: boolean;
  /** Ainda não chegou NADA. É esta que a tela usa pro esqueleto.
   *
   * 🔴 A tela usava `carregando`, que inclui a espera de cada busca: digitar
   * na pílula de subgrupo do Kanban trocava o quadro inteiro por um
   * esqueleto, letra a letra. Não aparecia na máquina local, onde a resposta
   * é instantânea; apareceu com 700ms de latência. */
  carregandoPrimeiraVez: boolean;
  erro: boolean;
  /** Entra em `onBuscar` do `Select`/`MultiSelect`. A primeira chamada
   * (termo vazio, no momento em que o painel abre) é o que liga a consulta. */
  buscar: (termo: string) => void;
  tentarDeNovo: () => void;
}
