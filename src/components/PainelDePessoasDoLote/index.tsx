import { Box, Menu, Portal, Text } from "@chakra-ui/react";
import { useState } from "react";

import Avatar from "../Avatar";
import Botao from "../Botao";
import { IconePessoa } from "../Icons";
import { useTodosOsMembros } from "../../hooks/useTodosOsMembros";
import { contar } from "../../utils";
import {
  DICA_DA_OPCAO,
  DIVISORIA_DO_PAINEL,
  NINGUEM_NO_PAINEL,
  NOME_DA_OPCAO,
  OPCAO_DO_LOTE,
  PAINEL_DO_LOTE,
  ROTULO_DO_PAINEL,
} from "../../theme/painelDoLote";
import type { PainelDePessoasDoLoteProps } from "./types";

/** O valor do item "Ninguém". Nenhum e-mail começa com dois sublinhados. */
const VALOR_DO_POOL = "__pool__";

/** "Atribuir a…" da barra do lote, e o painel de pessoas que ele abre.
 *
 * 🔴 **Cada pessoa diz, ANTES da escolha, quantas ficariam de fora.** A régua
 * do servidor é ser membro do subgrupo de cada tarefa, e numa seleção que
 * cruza subgrupos alguém pode ser membro de uns e não de outros. Descobrir
 * depois, em 40 tarefas, é caro de corrigir -- por isso o painel É a
 * confirmação, e atribuir não abre modal.
 *
 * ⚠️ A lista só é buscada quando o painel ABRE: uma requisição a cada seleção
 * pagaria por um painel que quase nunca abre. E vem de UMA chamada --
 * `Membro.subgrupos` já traz os subgrupos de cada pessoa.
 *
 * ➡️ `PLANO_ACOES_EM_LOTE.md`, Fase 8.
 */
export default function PainelDePessoasDoLote({ tarefas, desabilitado, onEscolher }: PainelDePessoasDoLoteProps) {
  const [aberto, setAberto] = useState(false);
  const membros = useTodosOsMembros(aberto);

  return (
    <Menu.Root open={aberto} onOpenChange={(e) => setAberto(e.open)}>
      <Menu.Trigger asChild>
        <Botao variante="ghost" disabled={desabilitado}>
          <IconePessoa />
          Atribuir a…
        </Botao>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content css={PAINEL_DO_LOTE}>
            <Text css={ROTULO_DO_PAINEL}>Atribuir {contar(tarefas.length, "tarefa", "tarefas")} a</Text>
            {membros.isError ? (
              <Text css={NOME_DA_OPCAO} px="12px" py="8px" color="status.bad.text">
                Não foi possível carregar as pessoas.
              </Text>
            ) : !membros.data ? (
              <Text css={NOME_DA_OPCAO} px="12px" py="8px" color="fg.subtle">
                Carregando…
              </Text>
            ) : (
              membros.data.map((m) => {
                const nome = m.apelido || m.email;
                const deles = m.subgrupos ?? [];
                const fora = tarefas.filter((t) => !deles.includes(t.subgrupo_id)).length;
                return (
                  <Menu.Item
                    key={m.email}
                    value={m.email}
                    css={OPCAO_DO_LOTE}
                    onSelect={() => onEscolher(m.email, nome)}
                  >
                    <Avatar nome={nome} tamanho="pequeno" />
                    <Box flex="1" minW="0">
                      <Text css={NOME_DA_OPCAO} truncate>
                        {nome}
                      </Text>
                      <Text css={DICA_DA_OPCAO} color={fora === 0 ? "status.good.text" : "status.warn.text"}>
                        {fora === 0
                          ? "Membro de todos os subgrupos da seleção"
                          : contar(fora, "ficará de fora — não é membro", "ficarão de fora — não é membro")}
                      </Text>
                    </Box>
                  </Menu.Item>
                );
              })
            )}
            <Box css={DIVISORIA_DO_PAINEL} />
            <Menu.Item value={VALOR_DO_POOL} css={OPCAO_DO_LOTE} onSelect={() => onEscolher(null, null)}>
              <Box css={NINGUEM_NO_PAINEL} aria-hidden="true" />
              <Text css={NOME_DA_OPCAO}>Ninguém — devolver ao pool</Text>
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
