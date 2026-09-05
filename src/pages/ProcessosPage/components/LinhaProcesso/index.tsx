import { Table, Text } from "@chakra-ui/react";

import { formatarData, formatarDataHoraAmPm, mascararNumeroProcesso } from "../../../../utils";
import { CelulaComSub, EtiquetasDeSubgrupo } from "../../../../components";
import type { Processo } from "../../../../types";
import type { LinhaProcessoProps } from "./types";

/** Uma linha da tabela de processos, nas 6 colunas do artifact.
 *
 * A linha inteira é clicável, então precisa ser alcançável pelo teclado:
 * `tabIndex` + Enter/Espaço. Sem isso, quem navega por Tab não consegue
 * abrir processo nenhum -- e não há outro caminho, porque as ações saíram
 * da linha e foram pro detalhe.
 */
/** O primeiro responsável, pelo apelido.
 *
 * ⚠️ Lê `responsaveis_nomes` PAREADO POR ÍNDICE com `responsaveis` -- é como
 * o servidor devolve, e é por isso que ele nunca omite uma posição (cai pro
 * próprio e-mail quando não há apelido). */
function nomeDoResponsavel(p: Processo): string {
  return p.responsaveis_nomes?.[0] ?? p.responsaveis?.[0] ?? "";
}

/** "+2" quando responde mais de uma pessoa. O nome de todos não cabe numa
 * célula, e a lista completa está na tela do processo. */
function restoDosResponsaveis(p: Processo): string | undefined {
  const quantos = p.responsaveis?.length ?? 0;
  return quantos > 1 ? `+${quantos - 1}` : undefined;
}

export default function LinhaProcesso({
  processo: p,
  subgrupoNome,
  clientesNomes,
  faseRotulo,
  situacaoRotulo,
  onAbrir,
}: LinhaProcessoProps) {
  const temApelido = Boolean(p.apelido);

  return (
    <Table.Row
      tabIndex={0}
      cursor="pointer"
      _hover={{ bg: "bg.canvas" }}
      /* Última linha sem divisória: a borda do cartão já fecha a tabela. */
      _last={{ "& td": { borderBottomWidth: 0 } }}
      _focusVisible={{ outline: "2px solid", outlineColor: "fg.brand", outlineOffset: "-2px" }}
      onClick={() => onAbrir(p)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onAbrir(p);
        }
      }}
    >
      <CelulaComSub
        variante="processo"
        principal={temApelido ? p.apelido : mascararNumeroProcesso(p.numero_processo)}
        sub={temApelido ? mascararNumeroProcesso(p.numero_processo) : undefined}
      />
      <CelulaComSub principal={clientesNomes(p) || "—"} />
      {/* 🔴 Etiqueta, e não texto solto: seis telas exibem o subgrupo com
          `EtiquetasDeSubgrupo`, e uma forma própria de desenhar a mesma coisa
          seria a que diverge no primeiro ajuste.

          ⚠️ **A coluna NÃO sai do lugar.** Ela é a 3ª, "na ordem do artifact"
          (`COLUNAS_PROCESSOS`), e fica. O que se padroniza é como ela é
          desenhada, não onde está: o subgrupo qualifica o processo, e
          qualificador longe do identificador obriga o olho a atravessar a
          linha e voltar.

          ⚠️ Lista de UM: processo pertence a um subgrupo só. O resumo por
          contagem do componente nunca chega a aparecer aqui -- ele existe para
          Membros, Inscrições e Histórico, onde a lista é lista de verdade. */}
      <CelulaComSub principal={<EtiquetasDeSubgrupo nomes={[subgrupoNome(p.subgrupo_id)]} />} />
      <CelulaComSub
        principal={situacaoRotulo(p.situacao_id) || "—"}
        sub={faseRotulo(p.fase_id) || undefined}
      />
      <CelulaComSub
        principal={p.ultima_mov_tipo || "Sem movimentação"}
        sub={
          // Duas datas diferentes de propósito: quando o tribunal publicou e
          // quando o robô olhou. Sem a segunda, não dá pra saber se o
          // silêncio é do processo ou do sistema.
          [
            p.ultima_mov_data ? formatarData(p.ultima_mov_data) : null,
            p.ultima_verificacao
              ? `verificado ${formatarDataHoraAmPm(p.ultima_verificacao)}`
              : "ainda não verificado",
          ]
            .filter(Boolean)
            .join(" · ")
        }
      />
      {/* Sem prazo, o traço vai DENTRO do mesmo `CelulaComSub`: uma
          `Table.Cell` crua aqui ficava sem a divisória e sem o padding de
          `.tbl td`, e a coluna toda desalinhava nas linhas sem prazo. */}
      <CelulaComSub
        principal={
          p.prazo_final ? (
            formatarData(p.prazo_final)
          ) : (
            <Text as="span" color="fg.subtle">
              —
            </Text>
          )
        }
        sub={(p.prazo_final && p.proxima_providencia) || undefined}
      />
      {/* 🔴 "Sem responsável" NÃO é um traço como as outras colunas vazias.
          É o sintoma de um item órfão: o aviso dele vai para os gestores do
          subgrupo (ou para o subgrupo inteiro, sem gestor), e sem a marca
          ninguém entende por quê. */}
      <CelulaComSub
        principal={
          nomeDoResponsavel(p) || (
            <Text as="span" color="fg.subtle">
              Sem responsável
            </Text>
          )
        }
        sub={restoDosResponsaveis(p)}
      />
    </Table.Row>
  );
}
