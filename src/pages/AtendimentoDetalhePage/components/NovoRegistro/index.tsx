import { Flex, Textarea } from "@chakra-ui/react";
import { useState } from "react";

import { Avatar, Botao } from "../../../../components";
import { getApelido, getEmail } from "../../../../services";

interface Props {
  enviando: boolean;
  /** Resolve quando o registro FOI gravado, rejeita se falhou -- é o que
   * diz ao campo se ele pode se limpar. */
  onEnviar: (texto: string) => Promise<unknown>;
}

/** O campo de escrever no fim da linha do tempo (`.tl-new` do artifact).
 *
 * Limpa sozinho só quando o envio DÁ CERTO -- quem escreveu três parágrafos
 * e viu a rede cair não pode perdê-los. Por isso o texto só é descartado no
 * callback de sucesso, e não ao clicar.
 */
export default function NovoRegistro({ enviando, onEnviar }: Props) {
  const [texto, setTexto] = useState("");

  const vazio = texto.trim() === "";

  return (
    <Flex gap="12px" pt="14px" align="flex-start">
      {/* O avatar de quem está escrevendo, como no artifact -- alinha a
          coluna com a das entradas acima. */}
      <Avatar nome={getApelido() || getEmail() || ""} tamanho="pequeno" />
      <Textarea
        flex="1"
        minH="64px"
        resize="vertical"
        aria-label="Novo registro do atendimento"
        placeholder="Adicionar novo registro..."
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />
      <Botao
        type="button"
        alignSelf="flex-end"
        disabled={vazio || enviando}
        onClick={async () => {
          if (vazio || enviando) return;
          try {
            await onEnviar(texto.trim());
            setTexto("");
          } catch {
            /* Fica tudo como está: o erro já vira toast lá em cima, e
               limpar aqui apagaria o que a pessoa acabou de escrever. */
          }
        }}
      >
        {enviando ? "Enviando…" : "Registrar"}
      </Botao>
    </Flex>
  );
}
