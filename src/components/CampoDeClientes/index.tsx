import { Box, Flex, Input, Text } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { BotaoNu } from "../BotaoNu";
import { IconeX } from "../Icons";
import { ESPERA_DA_BUSCA_MS } from "../../constants/busca";
import { Z_INDEX_CALENDARIO } from "../../constants/camadaFlutuante";
import { useValorComEspera } from "../../hooks/useValorComEspera";
import { useClientesBuscaveis } from "../../hooks/useOpcoesBuscaveis";
import { OPCAO_LINHA } from "../../theme/painelFiltro";
import { criarCliente, papelAtende } from "../../services";
import { useToast } from "../../contexts/ToastContext";
import { toastErroMutation } from "../../services/queryClient";

interface CampoDeClientesProps {
  id: string;
  /** Ids escolhidos. */
  valor: string[];
  /** Nome de cada id escolhido -- a etiqueta precisa mostrar nome, e o
   * resultado da busca some quando o termo muda. Guardado por fora pra que
   * a etiqueta não dependa de a busca ainda estar na tela. */
  nomes: Map<string, string>;
  onMudar: (ids: string[], nomes: Map<string, string>) => void;
}

/** Escolha de vários clientes, por busca.
 *
 * Busca, e não um seletor com a lista toda: um escritório tem centenas de
 * clientes, e carregá-los todos pra escolher dois é o custo que este campo
 * existe pra evitar.
 *
 * 🔴 A lista aparece ao FOCAR, com a primeira página em ordem alfabética --
 * antes exigia três caracteres antes de mostrar qualquer coisa, e até lá o
 * campo era uma caixa de texto muda: quem não lembrava a grafia do nome não
 * tinha por onde começar. É a mesma regra das pílulas de filtro (*toda lista
 * que pode crescer sem limite carrega a primeira página e se completa por
 * busca*), e as duas telas que oferecem cliente passam a se comportar igual.
 *
 * ⚠️ Vive em `components/`, e não dentro de uma página: Atendimentos e
 * Processos usam os dois.
 */
export default function CampoDeClientes({ id, valor, nomes, onMudar }: CampoDeClientesProps) {
  const [texto, setTexto] = useState("");
  const termo = useValorComEspera(texto.trim(), ESPERA_DA_BUSCA_MS);
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  const clientes = useClientesBuscaveis();
  const { buscar } = clientes;
  const queryClient = useQueryClient();
  const toast = useToast();

  /* 🔴 Cadastrar cliente é piso `manager` na API. Oferecer o atalho a quem a
     rota vai negar é o defeito que `podeRemoverResponsavel` já documenta: um
     controle que existe e devolve 400 é pior que um ausente. */
  const podeCadastrar = papelAtende("manager");

  const criar = useMutation({
    mutationFn: (nome: string) => criarCliente({ nome }),
    onSuccess: (novo: { cliente_id: string; nome: string }) => {
      /* Já entra escolhido: quem cadastrou dali estava escolhendo, e obrigar
         a procurar de novo o que acabou de criar é trabalho à toa. */
      escolher({ value: novo.cliente_id, label: novo.nome });
      /* A lista de clientes mudou -- a tela de Clientes e os outros campos
         que a leem precisam saber. */
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      toast.sucesso("Cliente cadastrado.");
    },
    onError: (err) => toastErroMutation(toast, err, "Não foi possível cadastrar o cliente."),
  });

  /* Nada é pedido antes de a pessoa mexer no campo -- a primeira chamada
     acontece no foco, e as seguintes acompanham o que ela digita. */
  useEffect(() => {
    if (aberto) buscar(termo);
  }, [aberto, termo, buscar]);

  /* Fecha ao clicar fora. O campo vive DENTRO de um modal, então não dá pra
     depender do descarte do modal -- ele fecharia a tela inteira. */
  useEffect(() => {
    function aoClicar(e: MouseEvent) {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", aoClicar);
    return () => document.removeEventListener("mousedown", aoClicar);
  }, []);

  /* Escolher duas vezes o mesmo cliente não significa nada. */
  const achados = clientes.opcoes.filter((o) => !valor.includes(o.value));

  /** O nome digitado, quando ele ainda não existe no cadastro.
   *
   * ⚠️ Compara com TODAS as opções que voltaram, não só com as que sobraram
   * de `achados`: um cliente já escolhido some daquela lista, e sem esta
   * distinção o atalho ofereceria cadastrar de novo quem está ali na frente,
   * como etiqueta. */
  const termoNovo =
    texto.trim() &&
    !clientes.opcoes.some((o) => o.label.trim().toLowerCase() === texto.trim().toLowerCase())
      ? texto.trim()
      : "";

  function escolher(opcao: { value: string; label: string }) {
    const novos = new Map(nomes);
    novos.set(opcao.value, opcao.label);
    onMudar([...valor, opcao.value], novos);
    setTexto("");
    setAberto(false);
  }

  function remover(clienteId: string) {
    onMudar(
      valor.filter((v) => v !== clienteId),
      nomes,
    );
  }

  /** 🔴 Escape com a lista aberta fecha A LISTA, e não o modal atrás.
   *
   * Mesma régua já aplicada no `Select` e no `SeletorData`: a camada de cima
   * consome o Escape. Este campo ficou de fora daquela correção, e o efeito
   * era o descrito lá -- quem só queria dispensar a lista perdia o formulário
   * inteiro e o texto já digitado.
   *
   * ⚠️ O `useEffect` logo acima já registra a mesma razão para o clique fora
   * ("não dá pra depender do descarte do modal"); faltava o teclado.
   *
   * ⚠️ `stopPropagation`, e não `preventDefault`: o listener do `Modal` é de
   * bolha em `document`, então basta o evento não chegar lá. Prevenir mexeria
   * no tratamento de quem está no meio do caminho.
   *
   * ⚠️ Vai no `Box` de fora, e não no `Input`: com o foco numa opção da
   * lista, um handler preso ao campo não veria a tecla.
   */
  function aoTeclar(evento: React.KeyboardEvent) {
    if (evento.key !== "Escape" || !aberto) return;
    evento.stopPropagation();
    setAberto(false);
  }

  return (
    <Box ref={caixa} position="relative" onKeyDown={aoTeclar}>
      <Input
        id={id}
        role="combobox"
        aria-expanded={aberto}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="Digite o nome do cliente"
        value={texto}
        onFocus={() => setAberto(true)}
        onChange={(e) => {
          setTexto(e.target.value);
          setAberto(true);
        }}
      />

      {aberto && (
        <Box
          position="absolute"
          top="100%"
          left="0"
          right="0"
          mt="4px"
          zIndex={Z_INDEX_CALENDARIO}
          bg="bg.surface"
          borderWidth="1px"
          borderStyle="solid"
          borderColor="border"
          borderRadius="md"
          boxShadow="md"
          overflow="hidden"
        >
          {/* Três respostas diferentes pra uma lista vazia -- ver
              `FalhaDoPainel`. "Nada encontrado" dito depois de uma consulta
              que falhou é uma afirmação sobre o cadastro do escritório
              tirada de um erro de rede. */}
          {clientes.erro ? (
            <Flex direction="column" gap="8px" align="flex-start" p={OPCAO_LINHA.padding}>
              <Text fontSize={OPCAO_LINHA.fonte} color="status.bad" fontWeight="600">
                Não foi possível carregar a lista.
              </Text>
              <BotaoNu
                type="button"
                onClick={clientes.tentarDeNovo}
                fontSize={OPCAO_LINHA.fonte}
                fontWeight="700"
                textDecoration="underline"
              >
                Tentar de novo
              </BotaoNu>
            </Flex>
          ) : clientes.carregando && achados.length === 0 ? (
            <Text p={OPCAO_LINHA.padding} fontSize={OPCAO_LINHA.fonte} color="fg.subtle">
              Carregando…
            </Text>
          ) : achados.length === 0 && !termoNovo ? (
            <Text p={OPCAO_LINHA.padding} fontSize={OPCAO_LINHA.fonte} color="fg.subtle">
              Nada encontrado
            </Text>
          ) : (
            /* Mantém o resultado anterior na tela enquanto o próximo vem,
               esmaecido. Esvaziar a cada tecla fazia o painel piscar. */
            <Box opacity={clientes.carregando ? 0.45 : 1} transition="opacity 120ms">
              {achados.map((opcao) => (
                <BotaoNu
                  key={opcao.value}
                  type="button"
                  onClick={() => escolher(opcao)}
                  display="block"
                  w="100%"
                  p={OPCAO_LINHA.padding}
                  fontSize={OPCAO_LINHA.fonte}
                  _hover={{ bg: "bg.canvas" }}
                >
                  {opcao.label}
                </BotaoNu>
              ))}
            </Box>
          )}

          {/* 🔴 Cadastrar sem sair do formulário. O caso é o de todo dia: a
              pessoa digita o nome, ele não está lá, e sair para a tela de
              Clientes significaria perder o processo que está preenchendo.

              ⚠️ "Novo cliente", e não "Cadastrar": o modal de processo tem o
              próprio botão "Cadastrar" (o que grava o processo), e dois
              controles com o mesmo nome na mesma tela é ambiguidade -- foi o
              que a verificação em Chrome pegou. "+ Novo …" é o idioma do
              sistema ("+ Novo processo", "+ Novo cliente").

              ⚠️ Só o NOME. Os demais campos do cliente (documento, telefone,
              endereço) ficam para a tela dele -- pedi-los aqui seria trocar
              um formulário por outro no meio do primeiro. */}
          {podeCadastrar && termoNovo && !clientes.erro && (
            <BotaoNu
              type="button"
              onClick={() => criar.mutate(termoNovo)}
              disabled={criar.isPending}
              display="block"
              w="100%"
              textAlign="left"
              p={OPCAO_LINHA.padding}
              fontSize={OPCAO_LINHA.fonte}
              fontWeight="700"
              color="fg.brand"
              borderTopWidth={achados.length > 0 ? "1px" : 0}
              borderTopStyle="solid"
              borderTopColor="border.subtle"
              _hover={{ bg: "bg.canvas" }}
            >
              {criar.isPending ? "Cadastrando…" : `+ Novo cliente “${termoNovo}”`}
            </BotaoNu>
          )}
        </Box>
      )}

      {valor.length > 0 && (
        <Flex gap="6px" wrap="wrap" mt="8px">
          {valor.map((clienteId) => (
            <Flex
              key={clienteId}
              align="center"
              gap="6px"
              bg="bg.brand.subtle"
              color="brand.darker"
              borderRadius="999px"
              px="10px"
              py="4px"
              fontSize="12px"
              fontWeight="700"
            >
              {/* Nome, nunca o id: a etiqueta é o único lugar onde a pessoa
                  confere se escolheu o cliente certo. */}
              {nomes.get(clienteId) ?? clienteId}
              <BotaoNu
                type="button"
                aria-label={`Remover ${nomes.get(clienteId) ?? clienteId}`}
                onClick={() => remover(clienteId)}
                display="flex"
                color="inherit"
                css={{ "& svg": { width: "11px", height: "11px" } }}
              >
                <IconeX />
              </BotaoNu>
            </Flex>
          ))}
        </Flex>
      )}
    </Box>
  );
}
