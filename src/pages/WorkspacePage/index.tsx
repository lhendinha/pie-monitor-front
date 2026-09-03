import { Box, Grid, Stack } from "@chakra-ui/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { Avatar, CabecalhoDePagina } from "../../components";
import { useToast } from "../../contexts/ToastContext";
import { getApelido, getEmail, resumoDaAreaDeTrabalho } from "../../services";
import { toastErroMutation, useToastOnQueryError } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import BotaoDeAssumir from "./components/BotaoDeAssumir";
import BotaoDeConcluir from "./components/BotaoDeConcluir";
import CardDeTarefas from "./components/CardDeTarefas";
import { DESTAQUE_MS } from "./constants";
import MinhasAtividades from "./components/MinhasAtividades";
import ResumoRapido from "./components/ResumoRapido";
import { useAssumirTarefa } from "./hooks/useAssumirTarefa";
import { useConcluirTarefa } from "./hooks/useConcluirTarefa";
import type { ResumoDaAreaDeTrabalho } from "../../types";

/** Área de trabalho: o resumo do dia.
 *
 * Duas colunas, como no artifact: à esquerda o que há pra fazer (listas de
 * tarefa), à direita o panorama (contagens). A da esquerda é mais larga
 * porque lá cada linha tem título, meta e prazo; a da direita são números.
 *
 * O avatar de responsável não precisa de consulta nenhuma: num card as
 * tarefas são todas minhas (uso o apelido da sessão), no outro nenhuma tem
 * dono -- e ali o avatar vazio É o botão de assumir.
 */
export default function WorkspacePage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const meuEmail = getEmail();
  const meuNome = getApelido() || meuEmail || "";

  const resumoQuery = useQuery<ResumoDaAreaDeTrabalho>({
    queryKey: qk.resumo(),
    queryFn: resumoDaAreaDeTrabalho,
  });
  useToastOnQueryError(resumoQuery.error, "Não foi possível carregar o resumo.");

  /** Depois de concluir ou assumir, o que muda não é só a lista: os números
   * do resumo mudam junto. Invalidar os dois mantém o card e a contagem
   * contando a mesma história. */
  function recarregar() {
    queryClient.invalidateQueries({ queryKey: ["tarefas"] });
    queryClient.invalidateQueries({ queryKey: qk.resumo() });
  }

  /** "Tarefas sem responsável", no Resumo rápido, conta exatamente o que o
   * card "Disponíveis para assumir" lista -- mesmo filtro, mesma tela.
   *
   * 🔴 Rolar E destacar, não só rolar. Em tela larga as duas colunas cabem
   * juntas, e aí `scrollIntoView` não move nada: o clique não teria resposta
   * nenhuma e pareceria quebrado. O destaque breve é o que liga o número à
   * lista nos dois tamanhos.
   *
   * ⚠️ O `setTimeout` é limpo ao desmontar. Sem isso, sair da tela dentro da
   * janela do destaque chamaria `setState` num componente morto. */
  const cardSemResponsavel = useRef<HTMLDivElement>(null);
  const [destacando, setDestacando] = useState(false);
  const relogioDoDestaque = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(relogioDoDestaque.current), []);

  function verSemResponsavel() {
    /* ⚠️ O destaque PRIMEIRO, e a rolagem com `?.()`. Nesta ordem porque
       `scrollIntoView` não existe em todo ambiente -- no jsdom ele nem é
       função. Chamando antes e sem guarda, o TypeError abortava o handler e
       o destaque nunca acontecia: a interação inteira morria por causa do
       enfeite. */
    setDestacando(true);
    clearTimeout(relogioDoDestaque.current);
    relogioDoDestaque.current = setTimeout(() => setDestacando(false), DESTAQUE_MS);
    cardSemResponsavel.current?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  }

  const concluir = useConcluirTarefa(
    () => {
      recarregar();
      toast.sucesso("Tarefa concluída.");
    },
    (err) => toastErroMutation(toast, err, "Não foi possível concluir."),
  );

  const assumir = useAssumirTarefa(
    () => {
      recarregar();
      toast.sucesso("Tarefa é sua.");
    },
    (err) => toastErroMutation(toast, err, "Não foi possível assumir."),
  );

  return (
    <>
      <CabecalhoDePagina
        titulo="Área de trabalho"
        subtitulo="Seu resumo do dia — tarefas, prazos e atividade recente."
      />

      <Grid templateColumns={{ base: "1fr", lg: "1.5fr 1fr" }} gap="20px" alignItems="start">
        <Stack gap="20px">
          <CardDeTarefas
            titulo="Minhas tarefas"
            filtro={{ responsavel: "eu" }}
            vazio="Nenhuma tarefa atribuída a você."
            acao={(t) => (
              <BotaoDeConcluir
                rotulo={`Concluir ${t.titulo}`}
                /* SÓ a tarefa clicada, não a lista toda: travar todas as
                   linhas ao concluir uma esconde qual delas está indo, e
                   parece que a tela inteira congelou. */
                desabilitado={concluir.isPending && concluir.variables?.tarefa_id === t.tarefa_id}
                onConcluir={() => concluir.mutate(t)}
              />
            )}
            responsavel={() => <Avatar nome={meuNome} tamanho="pequeno" />}
          />

          <Box
            ref={cardSemResponsavel}
            borderRadius="lg"
            transition="box-shadow 200ms"
            boxShadow={destacando ? "0 0 0 2px var(--chakra-colors-brand)" : "none"}
          >
          <CardDeTarefas
            titulo="Disponíveis para assumir"
            filtro={{ semResponsavel: true }}
            vazio="Todas as tarefas já têm responsável."
            /* Sem círculo de concluir aqui: não dá pra concluir o que não é
               seu. Assumir vem primeiro. */
            responsavel={(t) => (
              <BotaoDeAssumir
                rotulo={`Assumir ${t.titulo}`}
                desabilitado={
                  (assumir.isPending && assumir.variables?.tarefa.tarefa_id === t.tarefa_id) ||
                  !meuEmail
                }
                onAssumir={() => meuEmail && assumir.mutate({ tarefa: t, email: meuEmail })}
              />
            )}
          />
          </Box>
        </Stack>

        <Stack gap="20px">
          <MinhasAtividades
            resumo={resumoQuery.data}
            carregando={resumoQuery.isPending}
            falhou={resumoQuery.isError}
            onTentarDeNovo={() => resumoQuery.refetch()}
            tentando={resumoQuery.isFetching}
          />
          <ResumoRapido
            resumo={resumoQuery.data}
            carregando={resumoQuery.isPending}
            falhou={resumoQuery.isError}
            onTentarDeNovo={() => resumoQuery.refetch()}
            tentando={resumoQuery.isFetching}
            onVerSemResponsavel={verSemResponsavel}
          />
        </Stack>
      </Grid>
    </>
  );
}
