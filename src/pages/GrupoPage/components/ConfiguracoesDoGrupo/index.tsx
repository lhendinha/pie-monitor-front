import { Box, chakra, Flex, Input, Stack, Text } from "@chakra-ui/react";
import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  Botao,
  Campo,
  CartaoDeTabela,
  EstadoDeErro,
  Esqueleto,
  Select,
} from "../../../../components";
import { useToast } from "../../../../contexts/ToastContext";
import {
  atualizarConfiguracoesDoGrupo,
  lerCatalogoFinanceiro,
  lerConfiguracoesDoGrupo,
} from "../../../../services";
import { toastErroMutation } from "../../../../services/queryClient";
import { qk } from "../../../../services/queryKeys";
import { contar, unidade } from "../../../../utils";
import type {
  CatalogoFinanceiro,
  ConfiguracoesDoGrupo as Configuracoes,
} from "../../../../types";
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
  const [contaPadrao, setContaPadrao] = useState("");
  const toast = useToast();
  const queryClient = useQueryClient();

  const query = useQuery<Configuracoes>({
    queryKey: qk.configuracoesDoGrupo(),
    queryFn: () => lerConfiguracoesDoGrupo() as Promise<Configuracoes>,
  });

  /** As contas do Financeiro, para o select de conta padrão.
   *
   * ⚠️ Consulta À PARTE, e não um campo a mais nas configurações: o catálogo
   * é do Financeiro e tem chave própria de cache -- criar uma conta lá tem
   * de refletir aqui sem esta tela saber disso. O piso da rota é
   * `financeiro`, e quem chega nesta aba é `admin`, que está acima.
   *
   * 🔴 Só as ATIVAS entram: o servidor recusa uma conta desativada como
   * padrão, e oferecê-la seria empurrar para um 400. */
  const catalogo = useQuery<CatalogoFinanceiro>({
    queryKey: qk.catalogoFinanceiro(),
    queryFn: lerCatalogoFinanceiro,
  });
  const contasAtivas = (catalogo.data?.contas ?? []).filter((c) => c.ativa);

  /* Os campos nascem do que está salvo. Sem isto abririam vazios e um
     "Salvar" sem querer gravaria... nada, ou o mínimo. */
  useEffect(() => {
    if (query.data) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- semeadura do formulário a partir do que está salvo; o projeto usa `useEffect` pra isso de propósito, ver o eslint.config.js
      setNome(query.data.nome);
      setDias(String(query.data.dias_para_arquivar));
      setContaPadrao(query.data.conta_padrao_id ?? "");
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
  const nomeInvalido =
    nomeLimpo === "" || nomeLimpo.length > config.nome_tamanho_maximo;

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
  const contaMudou = contaPadrao !== (config.conta_padrao_id ?? "");

  const invalido = nomeInvalido || diasInvalido;
  const inalterado = !nomeMudou && !diasMudou && !contaMudou;

  /** Volta aos três campos como estão salvos. */
  function cancelar() {
    setNome(config.nome);
    setDias(String(config.dias_para_arquivar));
    setContaPadrao(config.conta_padrao_id ?? "");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (invalido || inalterado) return;
    salvar.mutate({
      ...(nomeMudou ? { nome: nomeLimpo } : {}),
      ...(diasMudou ? { dias_para_arquivar: numero } : {}),
      ...(contaMudou ? { conta_padrao_id: contaPadrao } : {}),
    });
  }

  return (
    /* ⚠️ **`CartaoDeTabela` de largura cheia**, como as abas irmãs de
       `/grupo` (Convidar, Inscrições, Fases): dentro de uma tela, a régua é
       a dos vizinhos. O que vem do molde de `PerfilPage` é o INTERIOR -- o
       padding do cartão, a divisória recuada por ele em vez de colada nas
       bordas, e os botões terminando na direita do conteúdo.
       ⚠️ Os campos param em 440px: uma linha de formulário com a largura da
       tela é ilegível, e o cartão largo é do vizinho, não do campo. */
    <CartaoDeTabela>
      <chakra.form onSubmit={handleSubmit}>
        <Box p="18px 20px">
          <Stack gap="0" maxW="440px">
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

            {/* 🔴 Depois do nome e ANTES do prazo não: a conta padrão é a
            escolha mais nova e a menos usada das três, e pôr o que se mexe
            uma vez por ano no meio do que se lê sempre atrapalha a leitura.
            Fica por último, antes do Salvar. */}
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
              /* ⚠️ O padrão fica AQUI, na dica do campo a que ele se refere.
             Ficava ao lado do "Salvar", de quando este formulário só tinha o
             prazo -- com três campos, uma nota solta no rodapé não diz mais
             a QUAL deles ela pertence. */
              dica={`A tarefa sai da coluna de conclusão e vai pra Arquivado. Ela continua contando como concluída. De ${config.dias_para_arquivar_minimo} a ${config.dias_para_arquivar_maximo} dias, e o padrão é ${contar(config.dias_para_arquivar_padrao, "dia", "dias")}.`}
              erro={
                diasInvalido
                  ? "Informe um número de dias dentro do limite."
                  : undefined
              }
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
                  {unidade(
                    Number.isInteger(numero) ? numero : 0,
                    "dia",
                    "dias",
                  )}
                </Text>
              </Stack>
            </Campo>

            <Campo
              rotulo="Conta padrão do Financeiro"
              para="conta-padrao"
              dica={
                contasAtivas.length === 0
                  ? "Nenhuma conta ativa no Financeiro ainda. Crie uma em Financeiro › Configurações."
                  : "Com qual conta o formulário de lançamento abre. Dá para trocar em cada lançamento."
              }
            >
              <Select
                id="conta-padrao"
                desabilitado={contasAtivas.length === 0}
                /* ⚠️ "Nenhuma" é opção de verdade, e não ausência: é o que
             permite LIMPAR a escolha. O servidor trata vazio como limpar,
             e a primeira conta criada depois vira padrão sozinha. */
                opcoes={[
                  { value: "", label: "Nenhuma" },
                  ...contasAtivas.map((c) => ({
                    value: c.conta_id,
                    label: c.nome,
                  })),
                ]}
                valor={contaPadrao}
                onMudar={(nova) => setContaPadrao(nova ?? "")}
              />
            </Campo>

            {/* O rodapé da casa: `RodapeDeAcoes` com "Cancelar" fantasma à
            esquerda, como em `PerfilPage/FormularioDaInscricao`. Com três
            campos, desfazer sem recarregar a página passou a fazer falta. */}
          </Stack>

          {/* O rodapé acompanha o CARTÃO, e não os 440px dos campos: a
              divisória de uma barra curta no meio de um cartão largo lê como
              erro de layout. */}
          <Flex
            justify="flex-end"
            gap="10px"
            mt="16px"
            pt="16px"
            borderTopWidth="1px"
            borderTopColor="border.subtle"
          >
            <Botao
              variante="ghost"
              onClick={cancelar}
              disabled={salvar.isPending || inalterado}
            >
              Cancelar
            </Botao>
            <Botao
              type="submit"
              disabled={invalido || inalterado || salvar.isPending}
            >
              {salvar.isPending ? "Salvando…" : "Salvar"}
            </Botao>
          </Flex>
        </Box>
      </chakra.form>
    </CartaoDeTabela>
  );
}
