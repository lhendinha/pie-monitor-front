import { Table, Text } from "@chakra-ui/react";

import { formatarData, formatarDataHoraAmPm, mascararNumeroProcesso } from "../../utils";
import CelulaComSub from "./CelulaComSub";
import type { Processo } from "../../types";

interface Props {
  processo: Processo;
  subgrupoNome: (id: string) => string;
  clientesNomes: (p: Processo) => string;
  faseRotulo: (id?: string | null) => string;
  situacaoRotulo: (id?: string | null) => string;
  onAbrir: (p: Processo) => void;
}

/** Uma linha da tabela de processos, nas 6 colunas do artifact.
 *
 * A linha inteira é clicável, então precisa ser alcançável pelo teclado:
 * `tabIndex` + Enter/Espaço. Sem isso, quem navega por Tab não consegue
 * abrir processo nenhum -- e não há outro caminho, porque as ações saíram
 * da linha e foram pro detalhe.
 */
export default function LinhaProcesso({
  processo: p,
  subgrupoNome,
  clientesNomes,
  faseRotulo,
  situacaoRotulo,
  onAbrir,
}: Props) {
  const temApelido = Boolean(p.apelido);

  return (
    <Table.Row
      tabIndex={0}
      cursor="pointer"
      _hover={{ bg: "bg.brand.subtle" }}
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
        mono={!temApelido}
        principal={temApelido ? p.apelido : mascararNumeroProcesso(p.numero_processo)}
        sub={temApelido ? mascararNumeroProcesso(p.numero_processo) : undefined}
      />
      <CelulaComSub principal={clientesNomes(p) || "—"} />
      <CelulaComSub principal={subgrupoNome(p.subgrupo_id)} />
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
      {p.prazo_final ? (
        <CelulaComSub
          principal={formatarData(p.prazo_final)}
          sub={p.proxima_providencia || undefined}
        />
      ) : (
        <Table.Cell verticalAlign="top" py="10px">
          <Text fontSize="13px" color="fg.subtle">
            —
          </Text>
        </Table.Cell>
      )}
    </Table.Row>
  );
}
