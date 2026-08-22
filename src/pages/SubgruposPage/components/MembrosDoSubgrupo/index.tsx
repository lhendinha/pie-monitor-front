import { Flex, Input, Stack, Text } from "@chakra-ui/react";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  Avatar,
  Botao,
  BotaoQuadrado,
  EstadoVazio,
  Esqueleto,
  EtiquetaDePapel,
  IconeLixeira,
  IconePlus,
  Modal,
  useToast,
} from "../../../../components";
import {
  adicionarMembro,
  listarMembrosDoGrupo,
  listarMembrosDoSubgrupo,
  removerMembro,
} from "../../../../services";
import { toastErroMutation, useToastOnQueryError } from "../../../../services/queryClient";
import { qk } from "../../../../services/queryKeys";
import { contar, emailValido } from "../../../../utils";
import type { Membro, Subgrupo } from "../../../../types";

interface Props {
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
export default function MembrosDoSubgrupo({ subgrupo, onFechar }: Props) {
  const [novoEmail, setNovoEmail] = useState("");
  const toast = useToast();
  const queryClient = useQueryClient();
  const queryKey = qk.membrosDoSubgrupo(subgrupo.subgrupo_id);

  const query = useQuery<{ membros: Membro[] }>({
    queryKey,
    queryFn: () => listarMembrosDoSubgrupo(subgrupo.subgrupo_id),
  });
  useToastOnQueryError(query.error, `Não foi possível carregar os membros de ${subgrupo.nome}.`);

  /** A lista por subgrupo devolve só e-mail. Apelido e papel vêm da lista do
   * grupo, que já tem os três -- em vez de pedir um join novo no backend.
   * Mesmo piso (`manager`) das outras duas rotas desta tela. */
  const grupoQuery = useQuery<{ membros: Membro[] }>({
    queryKey: qk.membros(),
    queryFn: listarMembrosDoGrupo,
  });
  const dadosPorEmail = new Map((grupoQuery.data?.membros || []).map((m) => [m.email, m]));

  function invalidar() {
    queryClient.invalidateQueries({ queryKey });
    // A contagem da linha vem da listagem de subgrupos: sem isto, o modal
    // mostraria uma coisa e a linha atrás outra.
    queryClient.invalidateQueries({ queryKey: ["subgrupos"] });
    queryClient.invalidateQueries({ queryKey: qk.membros() });
  }

  const adicionarMutation = useMutation({
    mutationFn: (email: string) =>
      adicionarMembro(subgrupo.subgrupo_id, email) as Promise<{ mensagem: string; email: string }>,
    onSuccess: (resp) => {
      setNovoEmail("");
      invalidar();
      // O servidor distingue "adicionei" de "já era membro". Dizer
      // "adicionado" nos dois casos esconderia que nada mudou.
      toast.sucesso(
        resp.mensagem === "adicionado"
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
    <Modal
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
      {query.isPending ? (
        <Esqueleto linhas={2} />
      ) : membros.length === 0 ? (
        <EstadoVazio mensagem="Ninguém neste subgrupo ainda." />
      ) : (
        <Stack gap="0">
          {membros.map((m) => {
            const dados = dadosPorEmail.get(m.email);
            const nome = dados?.apelido || m.email;
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
                  {dados?.apelido && (
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
                  onClick={() => removerMutation.mutate(m.email)}
                >
                  <IconeLixeira />
                </BotaoQuadrado>
              </Flex>
            );
          })}
        </Stack>
      )}
    </Modal>
  );
}
