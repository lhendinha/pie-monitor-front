import { Flex, Input, Text } from "@chakra-ui/react";
import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";

import { Botao, IconePlus, useToast } from "../../../../components";
import { criarSubgrupo } from "../../../../services";
import { toastErroMutation } from "../../../../services/queryClient";

interface Props {
  onCriado: () => void;
}

/** Criar subgrupo é a PRIMEIRA LINHA da lista, dentro do mesmo cartão --
 * como no artifact. Fora dele viraria um formulário solto acima da tabela,
 * e a ação deixaria de parecer parte da lista que ela alimenta.
 *
 * É um campo só, então não tem modal nem rótulo visível: o `placeholder` já
 * diz o que se escreve ali, e o `aria-label` repete pra quem usa leitor.
 */
export default function FormularioNovoSubgrupo({ onCriado }: Props) {
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");
  const toast = useToast();

  const criarMutation = useMutation({
    mutationFn: () => criarSubgrupo(nome.trim()),
    onSuccess: () => {
      setNome("");
      onCriado();
    },
    onError: (err) => {
      // O nome duplicado é o erro comum aqui, e a mensagem do servidor já
      // diz qual é -- o texto embaixo do campo dá o "onde" que o toast não dá.
      setErro("Não foi possível criar. Confira o nome.");
      toastErroMutation(toast, err, "Não foi possível criar.");
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro("");
    criarMutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit}>
      <Flex
        gap="8px"
        p="4px 4px 14px"
        mb="4px"
        borderBottomWidth="1px"
        borderBottomColor="border.subtle"
      >
        <Input
          aria-label="Nome do novo subgrupo"
          placeholder="Nome do novo subgrupo"
          value={nome}
          onChange={(e) => {
            setNome(e.target.value);
            setErro("");
          }}
          flex="1"
        />
        <Botao type="submit" disabled={criarMutation.isPending || !nome.trim()}>
          <IconePlus />
          {criarMutation.isPending ? "Criando…" : "Criar subgrupo"}
        </Botao>
      </Flex>
      {erro && (
        <Text px="4px" pb="10px" fontSize="12px" color="status.bad">
          {erro}
        </Text>
      )}
    </form>
  );
}
