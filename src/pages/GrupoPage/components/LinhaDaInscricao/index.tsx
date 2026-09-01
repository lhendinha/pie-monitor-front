import { Flex, Switch, Table, Text } from "@chakra-ui/react";

import { BotaoNu, BotaoQuadrado, Etiqueta, IconeLixeira } from "../../../../components";
import { CORES_DA_ETIQUETA_DE_DESTINO } from "../../constants";
import type { InscricaoAvulsa, Subgrupo } from "../../../../types";

interface LinhaDaInscricaoProps {
  inscricao: InscricaoAvulsa;
  /** Os subgrupos do grupo -- para traduzir os ids do destino em NOMES. Piso
   * `admin` na aba, e `listarSubgrupos` devolve todos para `admin`+. */
  subgrupos: Subgrupo[];
  /** Uma gravação DESTA linha está em voo. Por linha, e não pela lista toda:
   * numa lista de 50, travar tudo esconde qual delas está mudando. */
  emAndamento: boolean;
  /** Abre o modal com esta inscrição -- é lá que o destino se escolhe. */
  onAbrir: () => void;
  onDesligar: () => void;
  onRemover: () => void;
}

/** Uma inscrição avulsa na tabela: interruptor, destinos e remover.
 *
 * 🔴 **A linha é de LEITURA, menos por três gestos** -- desligar, remover e
 * abrir. Quem EDITA é o modal, e a razão é o servidor: ele zera
 * `subgrupos_destino` ao desligar e recusa ligar sem destino, então "ligar"
 * nunca é um gesto de um clique só. Um interruptor que às vezes liga e às
 * vezes precisa de mais informação é pior que um que sempre abre onde a
 * informação se dá.
 *
 * ➡️ Por isso LIGAR abre o modal e DESLIGAR grava direto: desligar não precisa
 * de nada, e obrigar a abrir um modal para dizer "pare" seria atrito puro.
 */
export default function LinhaDaInscricao({
  inscricao,
  subgrupos,
  emAndamento,
  onAbrir,
  onDesligar,
  onRemover,
}: LinhaDaInscricaoProps) {
  const ligada = inscricao.importacao_automatica;

  /* 🔴 Os dois ids existem para o NOME ACESSÍVEL do interruptor, e a razão foi
     medida: com `Switch.Label` presente, o Chakra emite `aria-labelledby`
     apontando para ele -- e `aria-labelledby` VENCE `aria-label`. O
     `aria-label` que eu tinha posto era ignorado em silêncio, e as 50 linhas
     ficavam com interruptores todos chamados "Desligada".

     ➡️ Apontar para os dois devolve "263/MG Ligada": identifica a linha e diz
     o estado. E `Switch.Label` continua existindo, então clicar na palavra
     ainda alterna -- que é o que se perderia pondo o texto fora do rótulo. */
  const idDaInscricao = `inscricao-${inscricao.inscricao}`;
  const idDoEstado = `estado-${inscricao.inscricao}`;

  /* ⚠️ NOME, e não id: o servidor guarda `subgrupo_id`, e a etiqueta com o id
     cru não diz nada a ninguém. Um destino que não casa com subgrupo nenhum
     cai no id -- é o que sobra quando o subgrupo foi apagado, e mostrar algo
     é melhor que a etiqueta sumir sem explicação. */
  const nomes = inscricao.subgrupos_destino.map(
    (id) => subgrupos.find((s) => s.subgrupo_id === id)?.nome ?? id,
  );

  return (
    <Table.Row>
      <Table.Cell
        p="13px 14px"
        borderBottomWidth="1px"
        borderBottomColor="border.subtle"
        width="150px"
      >
        {/* Mono e 600, como o artifact: é número que se compara de cima a
            baixo, e a fonte proporcional faz os dígitos dançarem de linha em
            linha. */}
        <BotaoNu
          id={idDaInscricao}
          type="button"
          title="Editar inscrição"
          fontFamily="mono"
          fontSize="13px"
          fontWeight="600"
          color="fg"
          _hover={{ color: "brand" }}
          disabled={emAndamento}
          onClick={onAbrir}
        >
          {inscricao.inscricao}
        </BotaoNu>
      </Table.Cell>

      <Table.Cell
        p="13px 14px"
        borderBottomWidth="1px"
        borderBottomColor="border.subtle"
        width="180px"
      >
        <Switch.Root
          checked={ligada}
          /* 🔴 Ligar ABRE o modal em vez de ligar: sem destino guardado, o
             servidor devolveria 400 -- e com destino guardado ele não existe,
             porque desligar zera. Ver o docstring do componente. */
          onCheckedChange={() => (ligada ? onDesligar() : onAbrir())}
          disabled={emAndamento}
        >
          {/* ⚠️ **Sem `role="switch"`** -- ver `InterruptorDaImportacao`: o
              Chakra v3 não emite `aria-checked`, e trocar o papel deixaria o
              estado DESCONHECIDO. Medido lá, não presumido aqui. */}
          <Switch.HiddenInput aria-labelledby={`${idDaInscricao} ${idDoEstado}`} />
          {/* A cor da marca, explícita -- o Chakra v3 pinta o trilho ligado de
              PRETO por padrão. Ver `InterruptorDaImportacao`. */}
          <Switch.Control _checked={{ bg: "brand" }}>
            <Switch.Thumb />
          </Switch.Control>
          {/* 🔴 A palavra ao lado, e não só o interruptor: cor e posição
              sozinhas não contam o estado a quem não as distingue -- a mesma
              régua de "(Inativa)" em `LinhaDeOpcao`. Desligada em `fg.subtle`
              porque é o estado neutro; ligada herda a cor do texto. */}
          <Switch.Label id={idDoEstado} fontSize="12.5px" color={ligada ? undefined : "fg.subtle"}>
            {ligada ? "Ligada" : "Desligada"}
          </Switch.Label>
        </Switch.Root>
      </Table.Cell>

      <Table.Cell p="13px 14px" borderBottomWidth="1px" borderBottomColor="border.subtle">
        {nomes.length === 0 ? (
          /* O travessão, e não a célula vazia: numa coluna com nome, vazio se
             lê como dado que faltou, não como "nada a declarar". */
          <Text as="span" fontSize="12.5px" color="fg.subtle">
            —
          </Text>
        ) : (
          /* 🔴 **Até DOIS mostra os nomes; de três em diante, a contagem.** É a
             régua de `utils/select.rotuloResumo`, que o `MultiSelect` do modal
             já aplica ao mesmo dado -- e é reusada aqui de propósito: duas
             maneiras de resumir a mesma lista, na mesma tela, divergem no
             primeiro ajuste.

             ⚠️ O motivo é a ALTURA DA LINHA. Um grupo pode ter 20 subgrupos, e
             vinte etiquetas quebram em quatro fileiras -- a linha da tabela
             cresce, as vizinhas não, e a coluna do interruptor descola do que
             ela descreve. Com o teto, a linha tem sempre uma altura.

             ⚠️ O `title` carrega a lista inteira, então nada se perde: o que a
             célula resume, o ponteiro devolve. */
          <Flex gap="6px" wrap="wrap" title={nomes.join(", ")}>
            {nomes.length <= 2 ? (
              nomes.map((nome) => (
                <Etiqueta key={nome} cores={CORES_DA_ETIQUETA_DE_DESTINO}>
                  {nome}
                </Etiqueta>
              ))
            ) : (
              <Etiqueta cores={CORES_DA_ETIQUETA_DE_DESTINO}>
                {`${nomes.length} subgrupos`}
              </Etiqueta>
            )}
          </Flex>
        )}
      </Table.Cell>

      <Table.Cell
        p="13px 14px"
        borderBottomWidth="1px"
        borderBottomColor="border.subtle"
        width="56px"
      >
        {/* 🔴 A LIXEIRA de Subgrupos, e não o × do artifact. O artifact desenha
            um × redondo, mas o sistema já tem um gesto de "tirar da lista", com
            uma forma e uma cor -- e Subgrupos, Clientes e Membros usam ele. Um
            segundo desenho para a mesma ação faria a pessoa aprender duas
            vezes; o artifact é o desenho da tela, não o do sistema. */}
        <BotaoQuadrado
          type="button"
          tom="perigo"
          title="Remover inscrição"
          aria-label={`Remover ${inscricao.inscricao}`}
          disabled={emAndamento}
          onClick={onRemover}
        >
          <IconeLixeira />
        </BotaoQuadrado>
      </Table.Cell>
    </Table.Row>
  );
}
