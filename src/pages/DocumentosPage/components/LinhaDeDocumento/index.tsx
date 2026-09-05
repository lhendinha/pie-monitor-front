import { Table, Text } from "@chakra-ui/react";

import { CelulaComSub, EtiquetasDeSubgrupo } from "../../../../components";
import { rotuloDoTipo } from "../../../../constants";
import { formatarDataDeInstante, mascararNumeroProcesso } from "../../../../utils";
import type { Documento } from "../../../../types";
import type { LinhaDeDocumentoProps } from "./types";

/** A que este documento pertence, numa frase curta.
 *
 * Prioriza o vínculo MAIS ESPECÍFICO: um documento ligado a um processo e ao
 * cliente daquele processo é encontrado pelo processo, e repetir o cliente na
 * mesma célula só gasta a largura.
 */
function vinculoDe(d: Documento): { principal: string; sub?: string } {
  const clientes = (d.cliente_nomes?.length ? d.cliente_nomes : d.cliente_ids) ?? [];
  if (d.processo_numero) {
    return {
      principal: mascararNumeroProcesso(d.processo_numero),
      sub: clientes.join(", ") || undefined,
    };
  }
  if (d.atendimento_id) {
    return { principal: "Atendimento", sub: clientes.join(", ") || undefined };
  }
  if (clientes.length) return { principal: clientes.join(", ") };
  return { principal: "—" };
}

/** Uma linha da tabela de documentos.
 *
 * A linha inteira é clicável e leva à tela do documento -- não há lixeira nem
 * lápis aqui. É o mesmo arranjo de Processos e Clientes: as ações vivem no
 * detalhe, e por isso a linha precisa ser alcançável pelo teclado
 * (`tabIndex` + Enter/Espaço). Sem isso, quem navega por Tab não teria
 * caminho nenhum pra abrir um documento.
 */
export default function LinhaDeDocumento({ documento, subgrupoNome, onAbrir }: LinhaDeDocumentoProps) {
  const vinculo = vinculoDe(documento);

  return (
    <Table.Row
      tabIndex={0}
      cursor="pointer"
      _hover={{ bg: "bg.canvas" }}
      /* Última linha sem divisória: a borda do cartão já fecha a tabela. */
      _last={{ "& td": { borderBottomWidth: 0 } }}
      _focusVisible={{ outline: "2px solid", outlineColor: "fg.brand", outlineOffset: "-2px" }}
      onClick={() => onAbrir(documento)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onAbrir(documento);
        }
      }}
    >
      <CelulaComSub
        variante="destaque"
        principal={documento.titulo}
        sub={documento.descricao || undefined}
      />
      {/* O rótulo cru pro tipo que esta versão não conhece -- ver
          `rotuloDoTipo`. Sumir com a linha seria esconder documento que
          existe. */}
      <CelulaComSub principal={rotuloDoTipo(documento.tipo)} />
      <CelulaComSub
        principal={
          vinculo.principal === "—" ? (
            <Text as="span" color="fg.subtle">
              —
            </Text>
          ) : (
            vinculo.principal
          )
        }
        sub={vinculo.sub}
      />
      {/* ⚠️ Lista de UM: documento pertence a um subgrupo só. O resumo por
          contagem de `EtiquetasDeSubgrupo` não chega a aparecer aqui -- ele
          existe para Membros, Inscrições e Histórico, onde a lista é lista. */}
      <CelulaComSub principal={<EtiquetasDeSubgrupo nomes={[subgrupoNome(documento.subgrupo_id)]} />} />
      <CelulaComSub
        principal={
          documento.responsavel_nome ||
          documento.responsavel_id || (
            <Text as="span" color="fg.subtle">
              —
            </Text>
          )
        }
      />
      <CelulaComSub principal={formatarDataDeInstante(documento.criado_em)} />
    </Table.Row>
  );
}
