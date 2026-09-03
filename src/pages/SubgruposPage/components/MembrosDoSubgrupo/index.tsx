import { Flex, Input, Stack, Text } from "@chakra-ui/react";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Avatar, Botao, BotaoQuadrado, EstadoVazio, EstadoDeErro, Esqueleto, EtiquetaDePapel, IconeLixeira, IconePlus, Modal, ModalDeConfirmacao } from "../../../../components";
import { useToast } from "../../../../contexts/ToastContext";
import {
  adicionarMembro,
  entrouAgora,
  listarTodosOsMembrosDoGrupo,
  listarMembrosDoSubgrupo,
  removerMembro,
} from "../../../../services";
import { toastErroMutation, useToastOnQueryError } from "../../../../services/queryClient";
import { qk } from "../../../../services/queryKeys";
import { contar, emailValido } from "../../../../utils";
import type { Subgrupo } from "../../../../types";
import type {
  RespostaDeMembroAdicionado,
  RespostaDeMembros,
} from "../../../../types/respostas";

interface MembrosDoSubgrupoProps {
  subgrupo: Subgrupo;
  onFechar: () => void;
}

/** Quem está neste subgrupo, com o campo de adicionar no rodapé.
 *
 * Abre pela contagem da linha ("3 membros"): o número já responde *quantos*,
 * e clicar responde *quem*. Sob demanda, e não uma seção por subgrupo
 * empilhada na tela -- assim é uma requisição, quando alguém pergunta, em
 * vez de uma por subgrupo ao abrir a aba.
 *
 * Pessoa e subgrupo é relação de mão dupla: dá pra editar daqui e pelo campo
 * "Subgrupos" do modal de editar membro. Os dois invalidam as mesmas
 * consultas, então a contagem da linha atrás muda junto.
 */
export default function MembrosDoSubgrupo({ subgrupo, onFechar }: MembrosDoSubgrupoProps) {
  const [novoEmail, setNovoEmail] = useState("");
  const [aConfirmarSaida, setAConfirmarSaida] = useState<string | null>(null);
  const toast = useToast();
  const queryClient = useQueryClient();
  const queryKey = qk.membrosDoSubgrupo(subgrupo.subgrupo_id);

  const query = useQuery<RespostaDeMembros>({
    queryKey,
    queryFn: () => listarMembrosDoSubgrupo(subgrupo.subgrupo_id),
  });
  useToastOnQueryError(query.error, `Não foi possível carregar os membros de ${subgrupo.nome}.`);

  /** O PAPEL de cada pessoa só existe na lista do grupo -- a lista por
   * subgrupo traz e-mail e apelido, não papel. Mesmo piso (`manager`) das
   * outras duas rotas desta tela.
   *
   * ⚠️ O apelido saía daqui também, e não sai mais: `/subgrupos/{id}/membros`
   * passou a devolvê-lo. Este join sobrevive só pelo papel. */
  const grupoQuery = useQuery<RespostaDeMembros>({
    queryKey: qk.todosOsMembros(),
    queryFn: listarTodosOsMembrosDoGrupo,
  });
  const dadosPorEmail = new Map((grupoQuery.data?.membros || []).map((m) => [m.email, m]));

  function invalidar() {
    queryClient.invalidateQueries({ queryKey });
    // A contagem da linha vem da listagem de subgrupos: sem isto, o modal
    // mostraria uma coisa e a linha atrás outra.
    queryClient.invalidateQueries({ queryKey: ["subgrupos"] });
    queryClient.invalidateQueries({ queryKey: qk.todosOsMembros() });
  }

  const adicionarMutation = useMutation({
    mutationFn: (email: string) =>
      adicionarMembro(subgrupo.subgrupo_id, email) as Promise<RespostaDeMembroAdicionado>,
    onSuccess: (resp) => {
      setNovoEmail("");
      invalidar();
      // O servidor distingue "adicionei" de "já era membro". Dizer
      // "adicionado" nos dois casos esconderia que nada mudou.
      toast.sucesso(
        entrouAgora(resp)
          ? `${resp.email} entrou no ${subgrupo.nome}.`
          : `${resp.email} já estava no ${subgrupo.nome}.`
      );
    },
    onError: (err) => toastErroMutation(toast, err, "Não foi possível adicionar."),
  });

  const removerMutation = useMutation({
    mutationFn: (email: string) => removerMembro(subgrupo.subgrupo_id, email),
    onSuccess: (_dados, email) => {
      invalidar();
      toast.sucesso(`${email} saiu do ${subgrupo.nome}.`);
    },
    onError: (err) => toastErroMutation(toast, err, "Não foi possível remover."),
  });

  const email = novoEmail.trim().toLowerCase();
  // O servidor recusa do mesmo jeito -- isto é pra a pessoa não descobrir o
  // erro de digitação só depois de mandar.
  const emailRuim = email.length > 0 && !emailValido(email);

  function handleAdicionar(e: FormEvent) {
    e.preventDefault();
    if (!email || emailRuim) return;
    adicionarMutation.mutate(email);
  }

  const membros = query.data?.membros || [];

  return (
    /* ⚠️ O diálogo de confirmação é IRMÃO do `Modal`, não filho.
     *
     * 🔴 `pilhaDeModais` assume "quem registrou por último está por cima",
     * e isso se INVERTE com aninhamento: o React roda os efeitos dos FILHOS
     * antes dos do pai, então um modal aninhado se registra ANTES do que o
     * contém -- e o Escape fecharia o de fora. Hoje está mascarado pelo
     * mount adiado e por callbacks estáveis do React Compiler, mas é
     * mascaramento, não correção.
     *
     * Todos os outros diálogos do sistema já são irmãos (`SubgruposPage`,
     * `ClientesPage`). Este era a exceção. */
    <>
    <Modal
      /* 🔴 Mesma situação do `ModalDoQuadro`: adicionar e remover membro
         gravam na hora, então o texto padrão MENTIRIA. O que está em risco é
         só o e-mail digitado e ainda não adicionado.

         ⚠️ Projeta o e-mail como o envio o manda (l. 110): `trim` e
         minúsculas. Sem isso, trocar a caixa de uma letra contaria como
         mudança sem mudar nada do que vai para o servidor.

         ⚠️ `aConfirmarSaida` fica fora -- é sinal de UI. */
      descarte={{
        mudou: novoEmail.trim().toLowerCase() !== "",
        textoProprio: {
          titulo: "Sair sem adicionar essa pessoa?",
          mensagem:
            "O e-mail digitado será descartado. Quem você já adicionou ou removeu aqui está salvo.",
          sair: "Sair",
          voltar: "Voltar",
        },
      }}
      titulo={`Membros do ${subgrupo.nome}`}
      /* Quantos, no cabeçalho: a lista responde isso enquanto cabe na tela,
         e para de responder assim que ela passa a rolar. */
      subtitulo={
        query.isPending
          ? undefined
          : `${contar(membros.length, "pessoa", "pessoas")} neste subgrupo`
      }
      onFechar={onFechar}
      rodape={
        <form onSubmit={handleAdicionar}>
          <Flex gap="8px" p="16px 22px" borderTopWidth="1px" borderTopColor="border.subtle">
            <Input
              type="email"
              aria-label={`Adicionar alguém a ${subgrupo.nome}`}
              placeholder="E-mail de quem entra no subgrupo"
              value={novoEmail}
              onChange={(e) => setNovoEmail(e.target.value)}
              flex="1"
            />
            <Botao type="submit" disabled={adicionarMutation.isPending || !email || emailRuim}>
              <IconePlus />
              Adicionar
            </Botao>
          </Flex>
          {emailRuim && (
            <Text px="22px" pb="14px" fontSize="12px" color="status.bad">
              E-mail inválido.
            </Text>
          )}
        </form>
      }
    >
      {/* Espera as DUAS: a etiqueta de papel vem da lista do grupo. Com só
          a primeira, as linhas apareciam com a etiqueta vazia e depois
          trocavam sozinhas na frente da pessoa. */}
      {query.isError || grupoQuery.isError ? (
        <EstadoDeErro
          mensagem={`Não foi possível carregar os membros de ${subgrupo.nome}.`}
          onTentarDeNovo={() => {
            if (query.isError) query.refetch();
            if (grupoQuery.isError) grupoQuery.refetch();
          }}
          tentando={query.isFetching || grupoQuery.isFetching}
        />
      ) : query.isPending || grupoQuery.isPending ? (
        <Esqueleto linhas={2} />
      ) : membros.length === 0 ? (
        <EstadoVazio mensagem="Ninguém neste subgrupo ainda." />
      ) : (
        <Stack gap="0">
          {membros.map((m) => {
            const dados = dadosPorEmail.get(m.email);
            const nome = m.apelido || dados?.apelido || m.email;
            return (
              <Flex
                key={m.email}
                align="center"
                gap="10px"
                p="11px 2px"
                borderBottomWidth="1px"
                borderBottomColor="border.subtle"
                _last={{ borderBottomWidth: 0 }}
              >
                <Avatar nome={nome} />
                <Stack gap="0" minW="0">
                  <Text fontSize="13.5px" fontWeight="700">
                    {nome}
                  </Text>
                  {(m.apelido || dados?.apelido) && (
                    <Text fontSize="12px" color="fg.subtle">
                      {m.email}
                    </Text>
                  )}
                </Stack>
                {/* Quem gerencia composição de subgrupo costuma querer saber
                    quem é gerente lá dentro. */}
                <EtiquetaDePapel papel={dados?.papel} />
                <BotaoQuadrado
                  type="button"
                  tom="perigo"
                  ml="auto"
                  title="Remover do subgrupo"
                  aria-label={`Remover ${nome} de ${subgrupo.nome}`}
                  /* `variables` diz QUAL linha está em voo -- travar a lista
                     inteira num modal de dez membros esconde qual delas
                     está saindo. */
                  disabled={
                    removerMutation.isPending && removerMutation.variables === m.email
                  }
                  onClick={() => setAConfirmarSaida(m.email)}
                >
                  <IconeLixeira />
                </BotaoQuadrado>
              </Flex>
            );
          })}
        </Stack>
      )}
    </Modal>
      {/* 🔴 Tirar alguém de um subgrupo PASSA ADIANTE tudo que ela responde lá
          dentro -- `membros_service.remover` chama `reatribuir_ao_sair`, que
          entrega tarefa, processo, atendimento e documento ao primeiro
          manager/admin/super_admin que sobrar (e a ninguém, se não sobrar),
          notificando quem herdou. A lixeira executava direto, e o toast só
          dizia "fulano saiu do X".
          A própria página declara a convenção oposta: "Excluir é a exceção:
          é irreversível, então passa pelo diálogo de confirmação como toda
          exclusão do sistema" -- e excluir o SUBGRUPO, que é bem menos
          destrutivo, tinha diálogo completo. */}
      {aConfirmarSaida && (
        <ModalDeConfirmacao
          titulo="Remover do subgrupo"
          mensagem={
            <>
              Remover <strong>{dadosPorEmail.get(aConfirmarSaida)?.apelido || aConfirmarSaida}</strong>{" "}
              de <strong>{subgrupo.nome}</strong>?
            </>
          }
          aviso="As tarefas dela neste subgrupo ficam sem responsável."
          rotulo="Remover"
          reversivel
          onConfirmar={() => {
            removerMutation.mutate(aConfirmarSaida);
            setAConfirmarSaida(null);
          }}
          onFechar={() => setAConfirmarSaida(null)}
        />
      )}
    </>
  );
}
