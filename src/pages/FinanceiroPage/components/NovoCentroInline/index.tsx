import { Flex, Input } from "@chakra-ui/react";
import { useState, type FormEvent } from "react";

import { Botao, IconePlus } from "../../../../components";
import type { NovoCentroInlineProps } from "./types";

/** Criar centro de custo é a PRIMEIRA LINHA da lista, dentro do mesmo
 * cartão -- gêmeo de `FormularioNovaOpcao`, das Fases e Situações.
 *
 * ⚠️ **As medidas são as de lá**, não as do artefato: `gap` de 8px, padding
 * `4px 4px 14px` e a divisória que separa o campo da lista. A primeira
 * versão copiou o `.nova` do artefato (10px de gap, sem divisória) e ficava
 * visivelmente diferente da aba ao lado -- dentro do sistema, a régua é a
 * dos vizinhos.
 *
 * ⚠️ **Dentro do cartão**, e não acima dele: fora, vira um formulário solto
 * e a ação deixa de parecer parte do que ela alimenta.
 *
 * ⚠️ **Inline, e não modal** -- achado 10 da auditoria do plano ("três
 * modais eram dois"). Centro de custo é só um nome; uma janela para um campo
 * só é uma parada a mais entre a pessoa e o que ela quer.
 *
 * ⚠️ Um campo só, então sem rótulo visível: o `placeholder` diz o que se
 * escreve, e o `aria-label` repete para quem usa leitor de tela.
 *
 * 🔴 O campo se esvazia no envio, e o botão nasce desabilitado: sem texto
 * não há o que criar, e deixá-lo aceso só para o servidor recusar é uma ida
 * ao servidor para ouvir um "não" que a tela já sabe.
 *
 * ➡️ `pages/FinanceiroPage/index.test.tsx`.
 */
export default function NovoCentroInline({ salvando, onAdicionar }: NovoCentroInlineProps) {
  const [nome, setNome] = useState("");
  const texto = "Novo centro de custo";

  function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    const limpo = nome.trim();
    if (!limpo || salvando) return;
    onAdicionar(limpo);
    setNome("");
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
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          flex="1"
        />
        <Botao type="submit" disabled={salvando || !nome.trim()}>
          <IconePlus />
          {salvando ? "Adicionando…" : "Adicionar"}
        </Botao>
      </Flex>
    </form>
  );
}
