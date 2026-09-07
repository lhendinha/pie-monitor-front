import { Flex, Input } from "@chakra-ui/react";
import { useState, type FormEvent } from "react";

import { Botao } from "../../../../components";
import type { NovoCentroInlineProps } from "./types";

/** O campo de criar centro de custo, no topo do cartão (`.nova` do
 * artifact).
 *
 * ⚠️ **Inline, e não modal** -- achado 10 da auditoria do plano ("três modais
 * eram dois"). Centro de custo é só um nome; uma janela para um campo só é
 * uma parada a mais entre a pessoa e o que ela quer.
 *
 * ⚠️ **O botão nasce desabilitado**, como no artifact: sem texto não há o
 * que criar, e deixá-lo aceso só para o servidor recusar é uma ida ao
 * servidor para ouvir um "não" que a tela já sabe.
 *
 * ⚠️ **`form` de verdade**, e não um `onClick` só: dentro de um campo, Enter
 * é o gesto natural de "adicionar", e sem o `form` ele não faria nada.
 *
 * 🔴 O campo se ESVAZIA no sucesso, e não antes: limpar no clique perderia o
 * texto se a chamada falhasse, e quem digitou teria de escrever de novo sem
 * saber por quê. Quem manda limpar é a tela, pelo `salvando` que volta a
 * `false` -- ver `ListaDeCentros`.
 *
 * ➡️ `pages/FinanceiroPage/index.test.tsx`.
 */
export default function NovoCentroInline({ salvando, onAdicionar }: NovoCentroInlineProps) {
  const [nome, setNome] = useState("");
  const vazio = nome.trim() === "";

  function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    if (vazio || salvando) return;
    onAdicionar(nome.trim());
    setNome("");
  }

  return (
    <form onSubmit={handleSubmit}>
      <Flex gap="10px" p="10px 10px 6px">
        <Input
          flex="1"
          aria-label="Novo centro de custo"
          placeholder="Novo centro de custo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <Botao type="submit" disabled={vazio || salvando}>
          {salvando ? "Adicionando…" : "+ Adicionar"}
        </Botao>
      </Flex>
    </form>
  );
}
