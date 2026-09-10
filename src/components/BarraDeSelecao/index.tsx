import { Box, Checkbox, Flex, Text } from "@chakra-ui/react";

import Botao from "../Botao";
import BotaoDeTexto from "../BotaoDeTexto";
import Faixa from "../Faixa";
import { IconeCheck, IconeLixeira } from "../Icons";
import PainelDePessoasDoLote from "../PainelDePessoasDoLote";
import PainelDeStatusDoLote from "../PainelDeStatusDoLote";
import { contar, motivoParaAlterarStatus, rotuloDeSelecao } from "../../utils";
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
  nota,
  tarefasMarcadas,
  subgrupoNome,
  onAtribuir,
  onAlterarStatus,
  onConcluir,
  agindo,
  onCancelar,
  onExcluir,
  excluindo,
}: BarraDeSelecaoProps) {
  const todasMarcadas = marcadas >= total && total > 0;
  const comAcoes = Boolean(tarefasMarcadas && subgrupoNome && onAtribuir && onAlterarStatus && onConcluir);
  /* Só o motivo de CRUZAR subgrupos vai à vista: "Selecione alguma tarefa"
     na barra repetiria o que o "0 de N" já diz. */
  const motivoDoStatus = comAcoes && marcadas > 0 ? motivoParaAlterarStatus(tarefasMarcadas ?? []) : "";

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

        {/* ⚠️ Some com o universo VAZIO. Na Agenda, entrar no modo troca a visão
            para lista e recarrega o período: nesse intervalo a barra dizia "0 de 0"
            e oferecia "Selecionar todas as 0", um clique que não faz nada -- e a
            seleção continuava vazia quando a lista chegava.
            Medido em Chrome em 10/09/2026, clicando logo depois de entrar no modo. */}
        {total > 0 && (
          <BotaoDeTexto onClick={onTodas}>
            {carregandoTodas
              ? "Carregando…"
              : todasMarcadas
                ? "Limpar seleção"
                : `Selecionar todas as ${total}`}
          </BotaoDeTexto>
        )}

        {/* Mesmo peso da contagem: o que o modo TIRA é tão importante quanto
            quantas estão marcadas, e em peso normal a frase se perdia na
            fileira. Com `wrap`, ela desce em vez de espremer os botões. */}
        {nota && (
          <Text fontSize="12.5px" fontWeight="700" color="brand.darker">
            {nota}
          </Text>
        )}

        {/* 🔴 O motivo À VISTA, e não só no `title` do botão travado: botão
            desabilitado não recebe o mouse em todo navegador, e aí o `title`
            nunca aparece. Some com a seleção de um subgrupo só. */}
        {motivoDoStatus && (
          <Text fontSize="12px" fontWeight="600" color="status.warn.text" truncate maxW="340px" title={motivoDoStatus}>
            {motivoDoStatus}
          </Text>
        )}

        <Flex align="center" gap="8px" ml="auto">
          <Botao variante="ghost" onClick={onCancelar}>
            Cancelar
          </Botao>
          {/* A ordem é a do artefato validado: as reversíveis entre o Cancelar e
              a única destrutiva, que fica sozinha na ponta. */}
          {comAcoes && (
            <>
              <PainelDePessoasDoLote
                tarefas={tarefasMarcadas ?? []}
                desabilitado={marcadas === 0 || agindo}
                onEscolher={(id, nome) => onAtribuir?.(id, nome)}
              />
              <PainelDeStatusDoLote
                tarefas={tarefasMarcadas ?? []}
                subgrupoNome={subgrupoNome ?? ((id) => id)}
                desabilitado={agindo}
                onEscolher={(coluna) => onAlterarStatus?.(coluna)}
              />
              <Botao variante="ghost" onClick={onConcluir} disabled={marcadas === 0 || agindo}>
                <IconeCheck />
                Concluir
              </Botao>
            </>
          )}
          <Botao variante="perigo" onClick={onExcluir} disabled={marcadas === 0 || excluindo}>
            <IconeLixeira />
            {excluindo ? "Excluindo…" : `Excluir ${marcadas}`}
          </Botao>
        </Flex>
      </Flex>

      {/* 🔴 "Sem responsável" NÃO é sinônimo de lixo.
          Medido em produção em 09/09/2026: três das quatro órfãs apontavam
          para um processo VIVO.
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
