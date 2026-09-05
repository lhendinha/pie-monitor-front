import { Flex, Textarea } from "@chakra-ui/react";
import { useState } from "react";

import { Avatar, Botao, IconeEnviar } from "../../../../components";
import { getApelido, getEmail } from "../../../../services";
import type { NovoRegistroProps } from "./types";

/** O campo de escrever no fim da linha do tempo (`.tl-new` do artifact).
 *
 * Limpa sozinho só quando o envio DÁ CERTO -- quem escreveu três parágrafos
 * e viu a rede cair não pode perdê-los. Por isso o texto só é descartado no
 * callback de sucesso, e não ao clicar.
 */
export default function NovoRegistro({ enviando, onEnviar }: NovoRegistroProps) {
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
        /* O recipe do Chakra dá 9px 12px e raio `sm` ao campo; o artifact
           quer 10px 12px e raio `md` neste (`.tl-new textarea`). Explícito
           porque o recipe vence o padrão herdado. */
        p="10px 12px"
        borderRadius="md"
        aria-label="Novo registro do atendimento"
        placeholder="Adicionar novo registro..."
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />
      {/* Só o ícone, como no artifact -- por isso o `aria-label` e o
          `title` não são enfeite: são o único nome que o botão tem, pra
          leitor de tela e pra quem passa o mouse sem reconhecer o desenho.
          O estado de envio vira o texto "Enviando…", que aí aparece. */}
      <Botao
        type="button"
        alignSelf="flex-end"
        aria-label="Adicionar registro"
        title="Adicionar registro"
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
        {enviando ? "Enviando…" : <IconeEnviar />}
      </Botao>
    </Flex>
  );
}
