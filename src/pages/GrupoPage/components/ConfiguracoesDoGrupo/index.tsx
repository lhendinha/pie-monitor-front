import { Input, Stack, Text } from "@chakra-ui/react";
import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Botao, Campo, CartaoDeTabela, EstadoDeErro, Esqueleto } from "../../../../components";
import { useToast } from "../../../../contexts/ToastContext";
import {
  atualizarConfiguracoesDoGrupo,
  lerConfiguracoesDoGrupo,
} from "../../../../services";
import { toastErroMutation } from "../../../../services/queryClient";
import { qk } from "../../../../services/queryKeys";
import { contar, unidade } from "../../../../utils";
import type { ConfiguracoesDoGrupo as Configuracoes } from "../../../../types";
import type { CamposDasConfiguracoes } from "../../types";

/** Sub-aba "Configurações" da tela de Grupo: nome do grupo e prazo de
 * arquivamento.
 *
 * Nasce como aba própria em vez de um campo solto em Subgrupos porque é
 * definição do ESCRITÓRIO, como Fases e Situações -- e porque é o lugar
 * natural pro que vier depois.
 */
export default function ConfiguracoesDoGrupo() {
  const [nome, setNome] = useState("");
  const [dias, setDias] = useState("");
  const toast = useToast();
  const queryClient = useQueryClient();

  const query = useQuery<Configuracoes>({
    queryKey: qk.configuracoesDoGrupo(),
    queryFn: () => lerConfiguracoesDoGrupo() as Promise<Configuracoes>,
  });

  /* Os campos nascem do que está salvo. Sem isto abririam vazios e um
     "Salvar" sem querer gravaria... nada, ou o mínimo. */
  useEffect(() => {
    if (query.data) {
      setNome(query.data.nome);
      setDias(String(query.data.dias_para_arquivar));
    }
  }, [query.data]);

  const salvar = useMutation({
    mutationFn: (campos: CamposDasConfiguracoes) =>
      atualizarConfiguracoesDoGrupo(campos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.configuracoesDoGrupo() });
      /* A listagem de grupos (tela de Membros, do super_admin) mostra este
         nome vindo de outra consulta -- sem isto ela ficaria com o antigo. */
      queryClient.invalidateQueries({ queryKey: qk.grupos() });
      toast.sucesso("Configurações salvas.");
    },
    onError: (err) => toastErroMutation(toast, err, "Não foi possível salvar."),
  });

  if (query.isPending) return <Esqueleto linhas={3} />;
  if (query.isError) {
    return (
      <CartaoDeTabela>
        <EstadoDeErro
          mensagem="Não foi possível carregar as configurações do grupo."
          onTentarDeNovo={() => query.refetch()}
          tentando={query.isFetching}
        />
      </CartaoDeTabela>
    );
  }

  const config = query.data!;

  const nomeLimpo = nome.trim();
  const nomeInvalido = nomeLimpo === "" || nomeLimpo.length > config.nome_tamanho_maximo;

  const numero = Number(dias);
  /* Os limites vêm do SERVIDOR junto do valor -- repeti-los aqui seria dois
     lugares pra manter em acordo, e quem manda continua sendo ele. */
  const diasInvalido =
    dias.trim() === "" ||
    !Number.isInteger(numero) ||
    numero < config.dias_para_arquivar_minimo ||
    numero > config.dias_para_arquivar_maximo;

  /* Só o que MUDOU vai no PATCH. Mandar os dois sempre faria um "Salvar" do
     nome sobrescrever um prazo que outra pessoa acabou de alterar. */
  const nomeMudou = nomeLimpo !== config.nome;
  const diasMudou = numero !== config.dias_para_arquivar;

  const invalido = nomeInvalido || diasInvalido;
  const inalterado = !nomeMudou && !diasMudou;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (invalido || inalterado) return;
    salvar.mutate({
      ...(nomeMudou ? { nome: nomeLimpo } : {}),
      ...(diasMudou ? { dias_para_arquivar: numero } : {}),
    });
  }

  return (
    <CartaoDeTabela>
      <Stack as="form" onSubmit={handleSubmit} gap="0" p="18px 20px" maxW="440px">
        <Campo
          rotulo="Nome do grupo"
          para="nome-do-grupo"
          obrigatorio
          /* Diz que o nome é único ANTES de a pessoa tentar: descobrir isso
             pelo 409 depois de digitar é o caminho pior. */
          /* Nada de prometer onde o nome aparece: hoje ele só é exibido na
             listagem de grupos do super_admin. */
          dica={`Não pode repetir o nome de outro grupo. Até ${config.nome_tamanho_maximo} caracteres.`}
          /* Mostra o erro assim que fica inválido, sem esperar digitar: os
             dois campos NASCEM com o valor salvo, então nunca há erro antes
             de a pessoa mexer -- e esvaziar sem explicação deixaria o
             Salvar desligado sem dizer por quê. */
          erro={
            nomeInvalido
              ? `Informe um nome de 1 a ${config.nome_tamanho_maximo} caracteres.`
              : undefined
          }
        >
          <Input
            id="nome-do-grupo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={config.nome_tamanho_maximo}
          />
        </Campo>

        <Campo
          rotulo="Arquivar concluídas depois de"
          para="dias-arquivar"
          /* 🔴 Exigido de verdade: `diasInvalido` inclui o campo VAZIO, e o
             Salvar fica desligado assim.

             ⚠️ Aqui a ausência do asterisco não era silêncio, era MENTIRA: o
             Nome do grupo, no mesmo cartão, já o trazia -- então este campo
             calado ao lado dele lia como dispensável. É o que separa este
             caso de LoginPage e EsqueciSenhaPage, onde NENHUM campo é
             marcado e a ausência não afirma nada. */
          obrigatorio
          /* Diz o QUE acontece, não só o que o campo aceita: "de 1 a 365" é
             a regra, mas a consequência é o que a pessoa precisa saber. */
          dica={`A tarefa sai da coluna de conclusão e vai pra Arquivado. Ela continua contando como concluída. De ${config.dias_para_arquivar_minimo} a ${config.dias_para_arquivar_maximo} dias.`}
          erro={diasInvalido ? "Informe um número de dias dentro do limite." : undefined}
        >
          <Stack direction="row" align="center" gap="10px">
            <Input
              id="dias-arquivar"
              type="number"
              inputMode="numeric"
              min={config.dias_para_arquivar_minimo}
              max={config.dias_para_arquivar_maximo}
              value={dias}
              onChange={(e) => setDias(e.target.value)}
              w="110px"
            />
            {/* ⚠️ `unidade`, e não `contar`: o campo ao lado JÁ mostra o
                número, e escrevê-lo de novo faz o olho ler o mesmo dado duas
                vezes ("[8] 8 dias"). A concordância continua -- com 1 é
                "dia". */}
            <Text fontSize="13.5px" color="fg.muted" flexShrink="0">
              {unidade(Number.isInteger(numero) ? numero : 0, "dia", "dias")}
            </Text>
          </Stack>
        </Campo>

        <Stack direction="row" gap="10px" align="center">
          <Botao type="submit" disabled={invalido || inalterado || salvar.isPending}>
            {salvar.isPending ? "Salvando…" : "Salvar"}
          </Botao>
          {/* O padrão fica dito, e não escondido no código: é a resposta
              pra "qual era mesmo o valor normal?". */}
          <Text fontSize="11.5px" color="fg.subtle">
            Prazo padrão: {contar(config.dias_para_arquivar_padrao, "dia", "dias")}
          </Text>
        </Stack>
      </Stack>
    </CartaoDeTabela>
  );
}
