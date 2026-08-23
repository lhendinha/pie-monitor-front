import { Grid, Stack } from "@chakra-ui/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Avatar, CabecalhoDePagina, useToast } from "../../components";
import { getApelido, getEmail, resumoDaAreaDeTrabalho } from "../../services";
import { toastErroMutation, useToastOnQueryError } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import BotaoDeAssumir from "./components/BotaoDeAssumir";
import BotaoDeConcluir from "./components/BotaoDeConcluir";
import CardDeTarefas from "./components/CardDeTarefas";
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
                desabilitado={concluir.isPending}
                onConcluir={() => concluir.mutate(t)}
              />
            )}
            responsavel={() => <Avatar nome={meuNome} tamanho="pequeno" />}
          />

          <CardDeTarefas
            titulo="Disponíveis para assumir"
            filtro={{ semResponsavel: true }}
            vazio="Todas as tarefas já têm responsável."
            /* Sem círculo de concluir aqui: não dá pra concluir o que não é
               seu. Assumir vem primeiro. */
            responsavel={(t) => (
              <BotaoDeAssumir
                rotulo={`Assumir ${t.titulo}`}
                desabilitado={assumir.isPending || !meuEmail}
                onAssumir={() => meuEmail && assumir.mutate({ tarefa: t, email: meuEmail })}
              />
            )}
          />
        </Stack>

        <Stack gap="20px">
          <MinhasAtividades resumo={resumoQuery.data} carregando={resumoQuery.isPending} />
          <ResumoRapido resumo={resumoQuery.data} carregando={resumoQuery.isPending} />
        </Stack>
      </Grid>
    </>
  );
}
