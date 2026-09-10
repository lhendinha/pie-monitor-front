import { Box, Checkbox, Flex, Text } from "@chakra-ui/react";

import Botao from "../Botao";
import BotaoDeTexto from "../BotaoDeTexto";
import Faixa from "../Faixa";
import { IconeLixeira } from "../Icons";
import { contar, rotuloDeSelecao } from "../../utils";
import type { BarraDeSelecaoProps } from "./types";

/** A barra que só existe enquanto há um modo de seleção de pé.
 *
 * 🔴 **Ela é a moldura do modo, e é ela que carrega o Cancelar** -- por isso a
 * entrada ("Selecionar") some do cabeçalho enquanto a barra está na tela.
 * Duas saídas para a mesma ação é o que a prop `rotuloDeCancelar` do
 * `ModalDeConfirmacao` já existe para impedir.
 *
 * ⚠️ **Ela PODE quebrar em duas fileiras, e o `flex-wrap` é de propósito.**
 * Medido em Chrome em 10/09/2026: com duas ações (Cancelar e Excluir) ela
 * cabe numa fileira só nos 634px do card da Área de trabalho -- altura 60px,
 * sem transbordo. Com as ações da Fase 8 o conteúdo passa de 600px e ela
 * quebra, com o estado em cima e as ações embaixo, à direita. O modo de
 * falha é benigno: `flex-wrap` desce, nunca transborda.
 *
 * ⚠️ A contagem é `aria-live`: quem usa leitor de tela precisa ouvir "12 de
 * 12" mudar sem ir procurar o número.
 */
export default function BarraDeSelecao({
  marcadas,
  total,
  estadoDaCaixa,
  vinculadas,
  onAlternarTopo,
  onTodas,
  carregandoTodas,
  onCancelar,
  onExcluir,
  excluindo,
}: BarraDeSelecaoProps) {
  const todasMarcadas = marcadas >= total && total > 0;

  return (
    <Box mb="4px">
      <Flex
        align="center"
        gap="11px"
        rowGap="9px"
        wrap="wrap"
        p="9px 12px"
        borderRadius="md"
        bg="bg.brand.subtle"
        borderWidth="1px"
        borderColor="brand.tint2"
      >
        <Checkbox.Root
          checked={estadoDaCaixa === "marcada" ? true : estadoDaCaixa === "indeterminada" ? "indeterminate" : false}
          onCheckedChange={onAlternarTopo}
          aria-label="Marcar todas as visíveis"
        >
          <Checkbox.HiddenInput />
          <Checkbox.Control />
        </Checkbox.Root>

        <Text fontSize="13.5px" fontWeight="700" color="brand.darker" role="status" aria-live="polite">
          {rotuloDeSelecao(marcadas, total)}
        </Text>

        <BotaoDeTexto onClick={onTodas}>
          {carregandoTodas
            ? "Carregando…"
            : todasMarcadas
              ? "Limpar seleção"
              : `Selecionar todas as ${total}`}
        </BotaoDeTexto>

        <Flex align="center" gap="8px" ml="auto">
          <Botao variante="ghost" onClick={onCancelar}>
            Cancelar
          </Botao>
          <Botao variante="perigo" onClick={onExcluir} disabled={marcadas === 0 || excluindo}>
            <IconeLixeira />
            {excluindo ? "Excluindo…" : `Excluir ${marcadas}`}
          </Botao>
        </Flex>
      </Flex>

      {/* 🔴 "Sem responsável" NÃO é sinônimo de lixo: medido em produção em
          09/09/2026, três das quatro órfãs apontavam para um processo VIVO.
          A faixa some quando o número é zero -- aviso que aparece sempre
          deixa de ser lido. */}
      {vinculadas > 0 && (
        <Box mt="10px">
          <Faixa tom="aviso" aEsquerda>
            {contar(vinculadas, "delas está vinculada", "delas estão vinculadas")} a um
            processo. Excluir a tarefa não altera o processo.
          </Faixa>
        </Box>
      )}
    </Box>
  );
}
