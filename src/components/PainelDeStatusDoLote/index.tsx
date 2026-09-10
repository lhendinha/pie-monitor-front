import { Box, Menu, Portal, Text } from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import Botao from "../Botao";
import { IconeMover } from "../Icons";
import Ponto from "../Ponto";
import { listarQuadro } from "../../services";
import { qk } from "../../services/queryKeys";
import { contar, motivoParaAlterarStatus } from "../../utils";
import {
  DICA_DA_OPCAO,
  NOME_DA_OPCAO,
  OPCAO_DO_LOTE,
  PAINEL_DO_LOTE,
  ROTULO_DO_PAINEL,
} from "../../theme/painelDoLote";
import type { RespostaDoQuadro } from "../../types/respostas";
import type { PainelDeStatusDoLoteProps } from "./types";

/** "Alterar status…" da barra do lote, e o painel de colunas que ele abre.
 *
 * 🔴 **"Status", e não "coluna" nem "mover".** "Coluna" é a ESTRUTURA do
 * quadro, que é `admin`; o status é o ESTADO da tarefa. Duas palavras para a
 * mesma coisa fazem a pessoa procurar a diferença que não existe -- é a
 * decisão 10 do plano, e o modal da tarefa diz "Status" pelo mesmo motivo.
 *
 * ⚠️ Trava quando a seleção cruza subgrupos, e o motivo vem de
 * `motivoParaAlterarStatus`. O quadro só é buscado quando o painel ABRE, e é
 * o de um subgrupo só -- o botão não abre de outro jeito.
 *
 * ➡️ `PLANO_ACOES_EM_LOTE.md`, Fase 8.
 */
export default function PainelDeStatusDoLote({
  tarefas,
  subgrupoNome,
  desabilitado,
  onEscolher,
}: PainelDeStatusDoLoteProps) {
  const [aberto, setAberto] = useState(false);
  const motivo = motivoParaAlterarStatus(tarefas);
  const subgrupoId = motivo ? "" : (tarefas[0]?.subgrupo_id ?? "");

  const quadro = useQuery<RespostaDoQuadro>({
    queryKey: qk.quadro(subgrupoId),
    queryFn: () => listarQuadro(subgrupoId) as Promise<RespostaDoQuadro>,
    enabled: aberto && Boolean(subgrupoId),
  });
  const colunas = [...(quadro.data?.colunas ?? [])].sort((a, b) => a.ordem - b.ordem);
  const jaAqui = new Map<string, number>();
  for (const t of tarefas) jaAqui.set(t.coluna_id, (jaAqui.get(t.coluna_id) ?? 0) + 1);

  return (
    <Menu.Root open={aberto} onOpenChange={(e) => setAberto(e.open)}>
      <Menu.Trigger asChild>
        <Botao variante="ghost" disabled={Boolean(motivo) || desabilitado} title={motivo || undefined}>
          <IconeMover />
          Alterar status…
        </Botao>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content css={PAINEL_DO_LOTE}>
            <Text css={ROTULO_DO_PAINEL}>Status no quadro de {subgrupoId ? subgrupoNome(subgrupoId) : ""}</Text>
            {quadro.isError ? (
              <Text css={NOME_DA_OPCAO} px="12px" py="8px" color="status.bad.text">
                Não foi possível carregar o quadro.
              </Text>
            ) : !quadro.data ? (
              <Text css={NOME_DA_OPCAO} px="12px" py="8px" color="fg.subtle">
                Carregando…
              </Text>
            ) : (
              colunas.map((c) => {
                const quantas = jaAqui.get(c.coluna_id) ?? 0;
                return (
                  <Menu.Item key={c.coluna_id} value={c.coluna_id} css={OPCAO_DO_LOTE} onSelect={() => onEscolher(c)}>
                    <Ponto tom={c.e_conclusao ? "bom" : "neutro"} />
                    <Box flex="1" minW="0">
                      <Text css={NOME_DA_OPCAO}>
                        {c.nome}
                        {c.e_conclusao && (
                          <Text as="span" color="status.good.text" fontSize="11px" fontWeight="800">
                            {" "}· conclusão
                          </Text>
                        )}
                      </Text>
                      {quantas > 0 && (
                        <Text css={DICA_DA_OPCAO} color="fg.subtle">
                          {contar(quantas, "já está aqui", "já estão aqui")}
                        </Text>
                      )}
                    </Box>
                  </Menu.Item>
                );
              })
            )}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
