/** Quadro, tarefa e calendário. */
/* ⚠️ `PrioridadeDaTarefa` e `StatusDeAtendimento` são DERIVADOS da constante que os
   gera (`typeof PRIORIDADES[number]`) -- é o que impede a lista de palavras
   e o tipo de divergirem. Derivá-los aqui obriga `types` a importar de
   `constants`, e o import é `import type`: some na compilação, então não há
   ciclo em tempo de execução.

   Import do ARQUIVO, não do índice de `constants` -- o índice reexporta o
   pacote inteiro, e puxá-lo daqui ligaria `types` a tudo que mora lá. */
import type { PRIORIDADES } from "../constants/prioridade";

/** Uma coluna do quadro Kanban de um subgrupo. */
export interface ColunaDoQuadro {
  subgrupo_id: string;
  coluna_id: string;
  nome: string;
  ordem: number;
  /** A coluna que marca conclusão. Só uma por quadro -- marcar outra
   * desmarca esta, no servidor. */
  e_conclusao: boolean;
  /** O destino do que já foi concluído há tempo demais pra ocupar espaço no
   * quadro. Tarefa arquivada CONTINUA CONCLUÍDA -- é concluída guardada,
   * não um terceiro estado.
   *
   * Coluna fixa: não se renomeia, não se move, não se exclui e não vira
   * conclusão. O servidor recusa as quatro coisas. */
  e_arquivado: boolean;
}

export interface Tarefa {
  subgrupo_id: string;
  tarefa_id: string;
  titulo: string;
  data: string;
  coluna_id: string;
  prioridade: string;
  responsavel_id?: string | null;
  /** Apelido de quem é responsável -- derivado, o servidor resolve pra
   * página pedida (`tarefas_router._serializar_tarefas`).
   *
   * 🔴 Vem junto porque a alternativa era o cartão baixar TODAS as pessoas
   * do grupo só pra traduzir e-mail em apelido -- e essa lista só chegava
   * pra `manager` pra cima, então o cartão de quem é `user` mostrava e-mail
   * cru pra sempre. Ausente quando a pessoa não tem apelido; aí o e-mail
   * continua sendo o rótulo, que ainda identifica. */
  responsavel_nome?: string | null;
  /** Nome da coluna do quadro em que a tarefa está -- derivado, resolvido
   * pelo servidor (`tarefas_router._serializar_tarefas`).
   *
   * 🔴 A Agenda pedia UM QUADRO POR SUBGRUPO exibido só pra saber isto. E
   * pedia só pros 50 primeiros, enquanto a lista de tarefas trazia todos os
   * visíveis -- acima disso a tarefa vinha sem nome de coluna e sem tachado.
   *
   * `undefined`/`null` quando o quadro não conhece a coluna; quem exibe omite
   * o pedaço em vez de mostrar um id cru. */
  coluna_nome?: string | null;
  /** A tarefa está concluída? Derivado de estar numa coluna marcada como
   * conclusão OU como arquivado -- arquivada é concluída guardada.
   *
   * ⚠️ **`esta_concluida`, e não `concluida`**, e o nome é deliberado: a
   * tarefa também carrega `concluido_em`, um carimbo GRAVADO que é ausente
   * em toda tarefa concluída antes do arquivamento existir. Dois campos
   * parecidos, um confiável e outro não. Este é o confiável.
   *
   * A decisão mora num lugar só, no servidor (`ColunaQuadro.conclui`). Antes,
   * a Agenda decidia de novo por conta (`e_conclusao || e_arquivado`). */
  esta_concluida?: boolean;
  /** O vínculo da tarefa. Um OU o outro, nunca os dois -- é assim que o
   * backend grava, e o campo da tela reflete isso sendo um só. */
  processo_numero?: string | null;
  atendimento_id?: string | null;
}

/** Um intervalo de datas, `aaaa-mm-dd` e inclusive nas duas pontas. */
export interface IntervaloDeDatas {
  de: string;
  ate: string;
}

/** Uma célula da grade de um mês. Os dias de fora do mês vêm MARCADOS
 * (`doMes: false`) em vez de omitidos -- a grade precisa começar no domingo
 * certo, e buraco no início desalinharia as colunas. */
export interface DiaDoCalendario {
  iso: string;
  dia: number;
  doMes: boolean;
}

export type PrioridadeDaTarefa = (typeof PRIORIDADES)[number];

export interface OpcoesListarTarefas {
  /** Filtra pelas tarefas de um processo -- é o que o detalhe do processo
   * usa. Sem ele, a única saída seria paginar a lista inteira do grupo e
   * peneirar no cliente. */
  processoNumero?: string;
  /** Um subgrupo, ou vários -- a Agenda escolhe um subconjunto.
   *
   * Array vira parâmetro repetido (`?subgrupo_id=a&subgrupo_id=b`), que é
   * como o FastAPI lê lista. Omitir continua significando "todos os
   * visíveis"; o servidor confere a permissão de CADA um. */
  subgrupoId?: string | string[];
  /** `"eu"` resolve pro e-mail do token, no servidor. */
  responsavel?: string;
  semResponsavel?: boolean;
  apenasAbertas?: boolean;
  /** Intervalo de `data`, inclusivo nas duas pontas. */
  dataDe?: string;
  dataAte?: string;
  pagina?: number;
  tamanhoPagina?: number;
}

export interface NovaTarefa {
  subgrupo_id: string;
  titulo: string;
  data: string;
  coluna_id: string;
  prioridade: string;
  responsavel_id?: string | null;
  processo_numero?: string | null;
  observacoes?: string | null;
}
