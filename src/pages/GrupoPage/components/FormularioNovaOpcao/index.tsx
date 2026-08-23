import { Flex, Input, Text } from "@chakra-ui/react";
import { useState, type FormEvent } from "react";

import { Botao, IconePlus } from "../../../../components";

interface Props {
  /** "fase" ou "situação", no singular -- vira o placeholder ("Nova fase"). */
  nomeSingular: string;
  enviando: boolean;
  erro?: string;
  onCriar: (rotulo: string) => void;
}

/** Criar opção é a PRIMEIRA LINHA da lista, dentro do mesmo cartão -- como
 * no artifact, e como em Subgrupos. Fora dele viraria um formulário solto
 * acima da lista, e a ação deixaria de parecer parte do que ela alimenta.
 *
 * Um campo só, então sem modal e sem rótulo visível: o `placeholder` já diz
 * o que se escreve ali, e o `aria-label` repete pra quem usa leitor.
 */
export default function FormularioNovaOpcao({ nomeSingular, enviando, erro, onCriar }: Props) {
  const [rotulo, setRotulo] = useState("");
  const texto = `Nova ${nomeSingular}`;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const limpo = rotulo.trim();
    if (!limpo) return;
    onCriar(limpo);
    setRotulo("");
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
          aria-label={texto}
          placeholder={texto}
          value={rotulo}
          onChange={(e) => setRotulo(e.target.value)}
          flex="1"
        />
        <Botao type="submit" disabled={enviando || !rotulo.trim()}>
          <IconePlus />
          {enviando ? "Adicionando…" : "Adicionar"}
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
