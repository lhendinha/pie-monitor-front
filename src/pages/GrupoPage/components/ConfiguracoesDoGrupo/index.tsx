import { Input, Stack, Text } from "@chakra-ui/react";
import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  Botao,
  Campo,
  CartaoDeTabela,
  EstadoDeErro,
  Esqueleto,
  useToast,
} from "../../../../components";
import {
  atualizarConfiguracoesDoGrupo,
  lerConfiguracoesDoGrupo,
} from "../../../../services";
import { toastErroMutation } from "../../../../services/queryClient";
import { qk } from "../../../../services/queryKeys";
import { contar } from "../../../../utils";
import type { ConfiguracoesDoGrupo as Configuracoes } from "../../../../types";

/** Sub-aba "Configurações" da tela de Grupo.
 *
 * Hoje só o prazo de arquivamento. Nasce como aba própria em vez de um campo
 * solto em Subgrupos porque é definição do ESCRITÓRIO, como Fases e
 * Situações -- e porque é o lugar natural pro que vier depois.
 */
export default function ConfiguracoesDoGrupo() {
  const [dias, setDias] = useState("");
  const toast = useToast();
  const queryClient = useQueryClient();

  const query = useQuery<Configuracoes>({
    queryKey: qk.configuracoesDoGrupo(),
    queryFn: () => lerConfiguracoesDoGrupo() as Promise<Configuracoes>,
  });

  /* O campo nasce do que está salvo. Sem isto ele abriria vazio e um
     "Salvar" sem querer gravaria... nada, ou o mínimo. */
  useEffect(() => {
    if (query.data) setDias(String(query.data.dias_para_arquivar));
  }, [query.data]);

  const salvar = useMutation({
    mutationFn: (valor: number) => atualizarConfiguracoesDoGrupo(valor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.configuracoesDoGrupo() });
      toast.sucesso("Prazo de arquivamento salvo.");
    },
    onError: (err) => toastErroMutation(toast, err, "Não foi possível salvar."),
  });

  if (query.isPending) return <Esqueleto linhas={2} />;
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
  const numero = Number(dias);
  /* Os limites vêm do SERVIDOR junto do valor -- repeti-los aqui seria dois
     lugares pra manter em acordo, e quem manda continua sendo ele. */
  const invalido =
    dias.trim() === "" ||
    !Number.isInteger(numero) ||
    numero < config.dias_para_arquivar_minimo ||
    numero > config.dias_para_arquivar_maximo;
  const inalterado = numero === config.dias_para_arquivar;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!invalido && !inalterado) salvar.mutate(numero);
  }

  return (
    <CartaoDeTabela>
      <Stack as="form" onSubmit={handleSubmit} gap="0" p="18px 20px" maxW="440px">
        <Campo
          rotulo="Arquivar concluídas depois de"
          para="dias-arquivar"
          /* Diz o QUE acontece, não só o que o campo aceita: "de 1 a 365" é
             a regra, mas a consequência é o que a pessoa precisa saber. */
          dica={`A tarefa sai da coluna de conclusão e vai pra Arquivado. Ela continua contando como concluída. De ${config.dias_para_arquivar_minimo} a ${config.dias_para_arquivar_maximo} dias.`}
          erro={invalido && dias.trim() !== "" ? "Informe um número de dias dentro do limite." : undefined}
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
            <Text fontSize="13.5px" color="fg.muted" flexShrink="0">
              {contar(Number.isInteger(numero) ? numero : 0, "dia", "dias")}
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
            Padrão: {contar(config.dias_para_arquivar_padrao, "dia", "dias")}
          </Text>
        </Stack>
      </Stack>
    </CartaoDeTabela>
  );
}
