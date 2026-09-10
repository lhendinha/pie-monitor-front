import { Box } from "@chakra-ui/react";

import { Cartao, EstadoVazio, Esqueleto } from "../../../../components";
import LinhaDeTarefa from "../LinhaDeTarefa";
import type { CartaoDeHojeProps } from "./types";

/** "Hoje" fixo na lateral da Agenda, INDEPENDENTE do que está navegado.
 *
 * É o ponto de retorno de quem foi olhar outro mês: a barra de datas leva a
 * pessoa para longe, e este cartão é o que sempre responde "e agora, o que é
 * meu para hoje".
 *
 * 🔴 As tarefas saem de `visiveis` -- as mesmas da pilha de dias, já
 * filtradas. Por isso ele SELECIONA junto: a mesma tarefa aparecendo
 * marcável de um lado e como botão de abrir do outro é um defeito que a
 * suíte cobra: `a linha deixa de ser BOTÃO e vira a caixa` conta DUAS.
 *
 * ➡️ `AgendaPage/index.test.tsx`; `PLANO_ACOES_EM_LOTE.md`, Fase 4.
 */
export default function CartaoDeHoje({
  hoje,
  tarefas,
  carregando,
  atrasadas,
  subgrupoNome,
  assuntoDoAtendimento,
  onAbrir,
  selecaoDe,
}: CartaoDeHojeProps) {
  return (
    <Cartao titulo={`Hoje · ${new Intl.DateTimeFormat("pt-BR").format(hoje)}`}>
      {carregando ? (
        <Box px="16px" py="10px">
          <Esqueleto linhas={3} />
        </Box>
      ) : atrasadas ? (
        /* 🔴 "Nenhuma tarefa para hoje" seria MENTIRA aqui, e uma mentira que
           a tela não tem como perceber: no modo atrasadas a consulta pede
           `data_ate: ontem`, então as de hoje nunca vêm -- a pessoa pode ter
           cinco e o cartão diria zero.
           Lista vazia sem dizer por quê é o defeito que este projeto
           persegue; aqui o "por quê" é o próprio filtro. */
        <EstadoVazio mensagem="Em Atrasadas a lista traz só o passado — as de hoje não entram." />
      ) : tarefas.length === 0 ? (
        <EstadoVazio mensagem="Nenhuma tarefa para hoje." />
      ) : (
        <Box px="16px" py="4px">
          {tarefas.map((tarefa, indice) => (
            <LinhaDeTarefa
              key={`${tarefa.subgrupo_id}:${tarefa.tarefa_id}`}
              tarefa={tarefa}
              concluida={tarefa.esta_concluida ?? false}
              nomeDaColuna={tarefa.coluna_nome ?? undefined}
              subgrupoNome={subgrupoNome(tarefa.subgrupo_id)}
              assuntoDoAtendimento={
                tarefa.atendimento_id ? assuntoDoAtendimento(tarefa.atendimento_id) : undefined
              }
              onAbrir={onAbrir}
              ultima={indice === tarefas.length - 1}
              selecao={selecaoDe?.(tarefa)}
              /* A caixa cabe aqui às custas do título -- ver `semEtiqueta`. */
              semEtiqueta={Boolean(selecaoDe)}
            />
          ))}
        </Box>
      )}
    </Cartao>
  );
}
