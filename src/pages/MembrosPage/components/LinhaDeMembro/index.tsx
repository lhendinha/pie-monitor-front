import { Table } from "@chakra-ui/react";

import {
  BotaoQuadrado,
  CelulaComSub,
  EtiquetaDePapel,
  EtiquetasDeSubgrupo,
  IconeLapis,
} from "../../../../components";
import type { Membro } from "../../../../types";

interface LinhaDeMembroProps {
  membro: Membro;
  /** Nomes dos subgrupos da pessoa, já resolvidos: `membro.subgrupos` traz
   * ids, e id não diz nada pra quem lê.
   *
   * ⚠️ LISTA, e não a string pronta: quem decide como resumir é
   * `EtiquetasDeSubgrupo`, que precisa saber QUANTOS são. Com a string já
   * unida, a contagem estaria perdida. */
  subgruposNomes: string[];
  /** Só `super_admin` edita membro (piso de `PATCH /grupos/membros/{email}`).
   * Sem isso, a linha inteira nem é clicável. */
  podeEditar: boolean;
  onEditar: (m: Membro) => void;
}

/** Uma linha da tabela de membros, nas 4 colunas do artifact mais a de ação.
 *
 * A linha inteira abre a edição, então precisa ser alcançável pelo teclado:
 * `tabIndex` + Enter/Espaço -- mesmo contrato da linha de processo.
 */
export default function LinhaDeMembro({ membro, subgruposNomes, podeEditar, onEditar }: LinhaDeMembroProps) {
  return (
    <Table.Row
      tabIndex={podeEditar ? 0 : undefined}
      cursor={podeEditar ? "pointer" : "default"}
      _hover={podeEditar ? { bg: "bg.canvas" } : undefined}
      /* Última linha sem divisória: a borda do cartão já fecha a tabela. */
      _last={{ "& td": { borderBottomWidth: 0 } }}
      _focusVisible={{ outline: "2px solid", outlineColor: "fg.brand", outlineOffset: "-2px" }}
      onClick={podeEditar ? () => onEditar(membro) : undefined}
      onKeyDown={(e) => {
        if (podeEditar && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onEditar(membro);
        }
      }}
    >
      {/* Sem apelido, o e-mail ocupa a coluna: uma célula em branco na
          primeira coluna faz a linha parecer defeito. */}
      <CelulaComSub variante="destaque" principal={membro.apelido || membro.email} />
      <CelulaComSub principal={membro.email} />
      <CelulaComSub principal={<EtiquetaDePapel papel={membro.papel} />} />
      <CelulaComSub principal={<EtiquetasDeSubgrupo nomes={subgruposNomes} />} />
      {podeEditar && (
        <CelulaComSub
          principal={
            <BotaoQuadrado
              type="button"
              title="Editar"
              aria-label={`Editar ${membro.apelido || membro.email}`}
              /* A linha inteira já abre a edição -- sem isto, o clique no
                 botão dispararia as duas coisas. */
              onClick={(e) => {
                e.stopPropagation();
                onEditar(membro);
              }}
            >
              <IconeLapis />
            </BotaoQuadrado>
          }
        />
      )}
    </Table.Row>
  );
}
