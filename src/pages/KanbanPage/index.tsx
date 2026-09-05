import { Flex } from "@chakra-ui/react";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DndContext, closestCorners } from "@dnd-kit/core";

import { Botao, CabecalhoDePagina, EstadoVazio, EstadoDeErro, Esqueleto, IconePlus, ModalDeTarefa } from "../../components";
import { PERIODO_TODOS } from "../../constants";
import { listarQuadro, papelAtende } from "../../services";
import { useToastOnQueryError } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import { intervaloDoPeriodo } from "../../utils";
import ColunaDoQuadro from "./components/ColunaDoQuadro";
import FiltrosDoKanban from "./components/FiltrosDoKanban";

import ModalDoQuadro from "./components/ModalDoQuadro";
import { useArrastarTarefa } from "./hooks/useArrastarTarefa";
import { useTarefaDoLink } from "./hooks/useTarefaDoLink";
import { useTarefasDoQuadro } from "./hooks/useTarefasDoQuadro";
import type { FiltrosDoQuadro } from "./types";
import type { RespostaDoQuadro } from "../../types/respostas";
import type { Tarefa } from "../../types";
import { podeListarPessoas } from "../../utils/permissoes";
import { usePessoasBuscaveis } from "../../hooks/usePessoasBuscaveis";
import { useSubgruposBuscaveis } from "../../hooks/useSubgruposBuscaveis";
import { useUltimoSubgrupo } from "../../hooks/useUltimoSubgrupo";
import type { KanbanPageProps } from "./types";

/** O quadro ABRE SEM JANELA DE DATA -- diverge do artifact, que abre no mês
 * (`PERIODS = { kanban: 'mes' }`).
 *
 * O mês só fazia sentido enquanto a janela limitava uma ponta só. Desde que
 * ela passou a limitar as DUAS (necessário pros períodos passados, como
 * "Ontem" e "Últimos 7 dias"), "Este mês" ESCONDE tarefa vencida do mês
 * anterior -- num quadro, exatamente o que mais precisa de atenção.
 *
 * O custo conhecido: tarefa concluída não some, só muda de coluna, então a
 * coluna de conclusão acumula com o tempo. Preferimos um quadro cheio a um
 * quadro que mente sobre o que está em aberto -- e a separação certa
 * (aberta × concluída, que a API sabe fazer com `apenas_abertas`) fica pra
 * quando o desenho da coluna de conclusão for decidido. */
/* ⚠️ `mostrarArquivadas` fica FORA daqui de propósito: "Limpar filtros" não
   pode esconder uma coluna que a pessoa acabou de revelar. É preferência de
   visualização, não filtro. */
const FILTROS_VAZIOS = {
  periodoId: PERIODO_TODOS,
  intervaloPersonalizado: undefined,
  pessoa: "todas",
  busca: "",
};

/** Gestão kanban.
 *
 * Cada subgrupo tem o PRÓPRIO quadro -- trocar o subgrupo não filtra, troca
 * de quadro. Por isso o seletor dele fica sempre ativo e fora do "Limpar
 * filtros".
 */
export default function KanbanPage({ tarefaDoLink }: KanbanPageProps = {}) {
  const [filtros, setFiltros] = useState<FiltrosDoQuadro>({
    /* O quadro abre no subgrupo da tarefa do link -- é o dela que interessa,
       não o último da lista. */
    subgrupoId: tarefaDoLink?.subgrupoId ?? "",
    mostrarArquivadas: false,
    ...FILTROS_VAZIOS,
  });
  const [tarefaAberta, setTarefaAberta] = useState<Tarefa | null>(null);
  const [criandoNaColuna, setCriandoNaColuna] = useState<string | null>(null);
  const [editandoQuadro, setEditandoQuadro] = useState(false);
  const queryClient = useQueryClient();

  /* A primeira página já na montagem: é dela que sai o quadro padrão. */
  const subgrupos = useSubgruposBuscaveis(true);
  /* Só quando a pílula de pessoas abrir -- o quadro não precisa da lista pra
     mostrar responsável, isso vem em `responsavel_nome` na própria tarefa. */
  const pessoas = usePessoasBuscaveis();
  const { lembrado, lembrar } = useUltimoSubgrupo("kanban");

  /** 🔴 Qual quadro abre, em ordem de prioridade.
   *
   * 1. O que a pessoa escolheu nesta sessão.
   * 2. O do link do lembrete (já entra em `filtros.subgrupoId`).
   * 3. O ÚLTIMO QUE ELA USOU, lembrado entre visitas.
   * 4. O primeiro da primeira página.
   *
   * ⚠️ O lembrado é usado mesmo fora da primeira página: é por isso que o
   * NOME é guardado junto (`useUltimoSubgrupo`).
   * ➡️ `CONTEXT.md`, "Histórias que saíram dos comentários", sobre o 3. */
  /* ⚠️ `primeiraPagina`, NUNCA `opcoes`: `opcoes` é o que a pílula mostra, e
     encolhe conforme a pessoa digita. Lendo dali, o quadro trocava sozinho no
     meio da busca -- e uma busca fechada sem escolher deixava a lista
     filtrada, então o padrão virava o resultado de um filtro que ninguém
     aplicou. */
  const subgrupoId =
    filtros.subgrupoId || lembrado?.id || subgrupos.primeiraPagina[0]?.value || "";
  const subgrupoNome =
    subgrupos.primeiraPagina.find((o) => o.value === subgrupoId)?.label ?? lembrado?.nome ?? "";

  const quadroQuery = useQuery<RespostaDoQuadro>({
    queryKey: qk.quadro(subgrupoId),
    queryFn: () => listarQuadro(subgrupoId),
    enabled: Boolean(subgrupoId),
  });
  useToastOnQueryError(quadroQuery.error, "Não foi possível carregar o quadro.");

  // `intervalo` é `null` em "Todos os períodos", e aí a janela sai vazia --
  // o serviço omite `data_de`/`data_ate` da query e vem o subgrupo inteiro.
  const intervalo = intervaloDoPeriodo(filtros.periodoId, filtros.intervaloPersonalizado);
  const tarefasQuery = useTarefasDoQuadro(
    subgrupoId,
    intervalo ? { dataDe: intervalo.de, dataAte: intervalo.ate } : {},
  );
  useToastOnQueryError(tarefasQuery.error, "Não foi possível carregar as tarefas.");

  useTarefaDoLink(tarefaDoLink, setTarefaAberta);

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: ["tarefas"] });
    queryClient.invalidateQueries({ queryKey: qk.resumo() });
  }

  const { sensors, handleDragEnd } = useArrastarTarefa(invalidar);

  const colunas = [...(quadroQuery.data?.colunas || [])].sort((a, b) => a.ordem - b.ordem);
  /** O Arquivado só aparece no quadro quando pedido.
   *
   * Ele é o depósito do que já saiu do fluxo -- à vista o tempo todo, rouba
   * uma coluna de largura pro que ninguém está tocando. Quem edita o quadro
   * continua vendo a coluna na lista do modal, com ou sem o filtro: é onde
   * ela precisa aparecer pra a regra do quadro fazer sentido. */
  const colunasVisiveis = colunas.filter((c) => !c.e_arquivado || filtros.mostrarArquivadas);
  const busca = filtros.busca.trim().toLowerCase();

  const visiveis = (tarefasQuery.data || []).filter((t) => {
    // 🔴 `digitos` precisa ser conferido antes de usar: `"".includes("")` é
    // `true`, então uma busca sem número ("recurso") casava com TODA tarefa
    // pelo segundo ramo, inclusive as sem processo -- e o quadro continuava
    // mostrando tudo, como se a busca não existisse.
    const digitos = busca.replace(/\D/g, "");
    const bateBusca =
      !busca ||
      t.titulo.toLowerCase().includes(busca) ||
      (digitos !== "" && (t.processo_numero || "").includes(digitos));
    const batePessoa =
      filtros.pessoa === "todas" ||
      (filtros.pessoa === "sem" ? !t.responsavel_id : t.responsavel_id === filtros.pessoa);
    return bateBusca && batePessoa;
  });

  const temFiltro =
    Boolean(busca) || filtros.pessoa !== "todas" || filtros.periodoId !== PERIODO_TODOS;

  /** Limpar leva a período NENHUM, e não de volta ao mês padrão: quem
   * clica em "Limpar filtros" olhando um quadro vazio quer VER tudo, e
   * devolvê-lo ao mês deixaria escondido justamente o que ele procura. */
  function limpar() {
    setFiltros((f) => ({ ...f, ...FILTROS_VAZIOS, periodoId: PERIODO_TODOS }));
  }

  /* ⚠️ `carregandoPrimeiraVez`, e não `carregando`: aquele inclui a espera de
     CADA busca, então digitar na pílula de subgrupo trocava o quadro inteiro
     por um esqueleto, letra a letra. Não aparece na máquina local, onde a
     resposta é instantânea; apareceu com 700ms de latência. */
  const carregando =
    subgrupos.carregandoPrimeiraVez || quadroQuery.isPending || tarefasQuery.isPending;
  /* Sem isto, uma falha de rede pintava o quadro vazio com "Nenhuma tarefa
     com os filtros atuais" -- acusando o filtro por um erro que não é dele,
     e oferecendo "Limpar filtros", que não resolve nada. */
  const falhou = subgrupos.erro || quadroQuery.isError || tarefasQuery.isError;
  const tentandoDeNovo = quadroQuery.isFetching || tarefasQuery.isFetching;

  function recarregarQuadro() {
    if (subgrupos.erro) subgrupos.tentarDeNovo();
    if (quadroQuery.isError) quadroQuery.refetch();
    if (tarefasQuery.isError) tarefasQuery.refetch();
  }

  return (
    <>
      <CabecalhoDePagina
        titulo="Gestão kanban"
        subtitulo="Cada subgrupo tem seu próprio quadro. Arraste os cartões entre colunas ou abra pra editar."
        acoes={
          subgrupos.primeiraPagina.length > 0 && (
            <>
              {/* O quadro é configuração do escritório -- `admin`, como o
                  servidor exige. A tarefa é trabalho do dia e fica aberta a
                  qualquer membro. */}
              {papelAtende("admin") && (
                <Botao variante="ghost" onClick={() => setEditandoQuadro(true)}>
                  Editar quadro
                </Botao>
              )}
              {/* ⚠️ Sem coluna não há onde a tarefa cair. O modal até abre,
                  mas `colunaEscolhida` fica vazia e "Salvar" nasce travado --
                  ou seja, um formulário inteiro que não conclui. Enquanto o
                  quadro não existe, o caminho é montá-lo, e é isso que o
                  estado vazio abaixo oferece. */}
              {colunas.length > 0 && (
                <Botao onClick={() => setCriandoNaColuna(colunas[0]?.coluna_id ?? "")}>
                  <IconePlus />
                  Nova tarefa
                </Botao>
              )}
            </>
          )
        }
      />

      {/* Grupo recém-criado não tem subgrupo nenhum -- é o PRIMEIRO estado
          que um cliente novo vê, não um caso raro. */}
      {!subgrupos.carregandoPrimeiraVez && subgrupos.primeiraPagina.length === 0 ? (
        <EstadoVazio
          mensagem="Nenhum subgrupo ainda. O quadro é por subgrupo, então crie um primeiro."
          acao={
            papelAtende("manager") ? (
              <Botao variante="ghost" onClick={() => window.location.assign("/grupo")}>
                Ir para Grupo
              </Botao>
            ) : undefined
          }
        />
      ) : (
        <>
          <FiltrosDoKanban
            subgrupos={subgrupos}
            subgrupoNome={subgrupoNome}
            pessoas={pessoas}
            mostrarPessoas={podeListarPessoas()}
            filtros={{ ...filtros, subgrupoId }}
            onMudar={(parcial) => setFiltros((f) => ({ ...f, subgrupoId, ...parcial }))}
            onEscolherSubgrupo={(id, nome) => {
              lembrar(id, nome);
              setFiltros((f) => ({ ...f, subgrupoId: id }));
            }}
          />

          {falhou ? (
            <EstadoDeErro
              mensagem="Não foi possível carregar o quadro."
              onTentarDeNovo={recarregarQuadro}
              tentando={tentandoDeNovo}
            />
          ) : carregando ? (
            <Esqueleto linhas={4} />
          ) : colunas.length === 0 ? (
            /* 🔴 Subgrupo SEM COLUNA NENHUMA -- e a tela não pode ficar em
               branco.
             *
             * `subgrupos_service.criar` semeia o quadro padrão junto, então
             * o caminho normal nunca chega aqui. Mas quadro sem coluna é um
             * estado ALCANÇÁVEL: subgrupo gravado fora do serviço (foi o que
             * aconteceu na semeadura local, e a tela de Kanban abria em
             * branco no primeiro clique de quem subia o ambiente), criação
             * que falhou no meio, ou alguém que apagou as colunas uma a uma.
             *
             * Antes disto o quadro simplesmente não desenhava nada: sem
             * colunas, sem mensagem, sem erro. Com cara de sistema quebrado,
             * e sem dizer a ninguém o que fazer.
             *
             * ⚠️ A mensagem muda com quem está olhando, porque a saída é
             * outra: criar coluna é `admin` (o servidor exige), então quem
             * PODE resolver recebe o caminho e quem não pode recebe a quem
             * pedir. Uma frase só ou mandaria o admin procurar outra pessoa,
             * ou mandaria o `user` para um botão que ele não tem. */
            <EstadoVazio
              mensagem={
                papelAtende("admin")
                  ? "Este subgrupo ainda não tem quadro. Crie as colunas para começar a usar o kanban."
                  : "O quadro deste subgrupo ainda não foi montado. Peça a um admin para criar as colunas."
              }
              acao={
                papelAtende("admin") ? (
                  <Botao variante="ghost" onClick={() => setEditandoQuadro(true)}>
                    Editar quadro
                  </Botao>
                ) : undefined
              }
            />
          ) : temFiltro && visiveis.length === 0 ? (
            /* Quadro vazio POR FILTRO não é o mesmo que quadro vazio: sem
               dizer isso, a pessoa vê as colunas zeradas e acha que perdeu
               as tarefas. E como a janela de datas é o filtro que mais
               esconde, o caminho de saída fica junto. */
            <EstadoVazio
              mensagem="Nenhuma tarefa com os filtros atuais."
              acao={
                <Botao variante="ghost" onClick={limpar}>
                  Limpar filtros
                </Botao>
              }
            />
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
              <Flex gap="16px" align="flex-start" overflowX="auto" pb="8px">
                {colunasVisiveis.map((c) => (
                  <ColunaDoQuadro
                    key={c.coluna_id}
                    coluna={c}
                    tarefas={visiveis.filter((t) => t.coluna_id === c.coluna_id)}
                    onAbrirTarefa={setTarefaAberta}
                    onNovaTarefa={setCriandoNaColuna}
                  />
                ))}
              </Flex>
            </DndContext>
          )}
        </>
      )}

      {editandoQuadro && (
        <ModalDoQuadro
          subgrupoId={subgrupoId}
          subgrupoNome={subgrupoNome}
          colunas={colunas}
          onFechar={() => setEditandoQuadro(false)}
        />
      )}

      {(tarefaAberta || criandoNaColuna !== null) && (
        <ModalDeTarefa
          tarefa={tarefaAberta}
          subgrupoAtual={subgrupoId}
          subgrupoAtualNome={subgrupoNome}
          colunaInicial={criandoNaColuna ?? undefined}
          onSalvo={invalidar}
          onFechar={() => {
            setTarefaAberta(null);
            setCriandoNaColuna(null);
          }}
        />
      )}
    </>
  );
}
