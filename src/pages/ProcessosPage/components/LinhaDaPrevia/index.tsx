import { Checkbox, Table, Text } from "@chakra-ui/react";

import { CelulaComSub } from "../../../../components";
import { mascararNumeroProcesso } from "../../../../utils";
import EtiquetaDeSituacao from "../EtiquetaDeSituacao";
import type { ProcessoEncontrado } from "../../../../types";

interface LinhaDaPreviaProps {
  processo: ProcessoEncontrado;
  marcado: boolean;
  onAlternar: () => void;
}

/** Uma linha da tabela da prévia: a caixa de marcar, o processo, o tribunal,
 * as comunicações e a situação. */
export default function LinhaDaPrevia({ processo, marcado, onAlternar }: LinhaDaPreviaProps) {
  return (
    <Table.Row
      /* O alvo do mouse é a linha inteira, não só a caixa -- e por
         isso o cursor de recusa também é dela. Mesmo padrão de
         `CampoDeArquivo`. */
      cursor={processo.ja_existe ? "not-allowed" : "pointer"}
      _hover={{ bg: "bg.canvas" }}
      /* 🔴 O clique vindo da CAIXA não passa por aqui -- `Checkbox.Root`
         é um `<label>`, então clicar nela já dispara o
         `onCheckedChange` E sobe para a linha. Com os dois marcando,
         a caixa "não funcionava": marcava e desmarcava no mesmo
         clique, e o único alvo que respondia era o resto da linha. */
      onClick={(evento) => {
        if (processo.ja_existe) return;
        if ((evento.target as HTMLElement).closest("label")) return;
        onAlternar();
      }}
    >
      {/* 🔴 `CelulaComSub` em TODAS as células, inclusive nas de uma
          linha só. `Table.Cell` crua não tem o padding de `.tbl td`
          (13px 14px) nem a divisória, e o cabeçalho tem 14px de
          recuo -- então o valor não nasce embaixo do título da
          coluna, e a divisória some no meio da linha.

          ⚠️ É o MESMO defeito que `LinhaProcesso` já registra na
          coluna de prazo. Segunda ocorrência: virou guarda mecânico
          em `celulaDeTabela.test.ts`. */}
      <CelulaComSub
        largura="42px"
        principal={
          <Checkbox.Root
            checked={marcado}
            disabled={processo.ja_existe}
            onCheckedChange={onAlternar}
            aria-label={`Importar ${processo.apelido}`}
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control />
          </Checkbox.Root>
        }
      />
      {/* ⚠️ O já cadastrado sai esmaecido (`tr.ja-existe .apelido` no
          desenho): a linha continua legível, mas some do primeiro
          plano -- ela é a única que não vai a lugar nenhum. */}
      <CelulaComSub
        variante="processo"
        principal={
          processo.ja_existe ? (
            <Text as="span" color="fg.muted" fontWeight="400">
              {processo.apelido}
            </Text>
          ) : (
            processo.apelido
          )
        }
        sub={mascararNumeroProcesso(processo.numero_processo)}
      />
      <CelulaComSub principal={processo.tribunal || "—"} />
      <CelulaComSub principal={<Text className="num">{processo.comunicacoes}</Text>} />
      <CelulaComSub principal={<EtiquetaDeSituacao processo={processo} />} />
    </Table.Row>
  );
}
