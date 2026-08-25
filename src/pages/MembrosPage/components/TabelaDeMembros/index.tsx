import { EstadoVazio, Tabela } from "../../../../components";
import { COLUNAS_MEMBROS, COLUNA_DE_ACOES } from "../../constants";
import LinhaDeMembro from "../LinhaDeMembro";
import type { Membro } from "../../../../types";

interface TabelaDeMembrosProps {
  membros: Membro[];
  /** id do subgrupo -> nome. `membro.subgrupos` traz ids, e id não diz nada
   * pra quem lê. */
  podeEditar: boolean;
  onEditar: (m: Membro) => void;
}

/** A tabela de pessoas do grupo, nas 4 colunas do artifact. */
export default function TabelaDeMembros({ membros, podeEditar, onEditar }: TabelaDeMembrosProps) {
  return (
    <Tabela
      colunas={podeEditar ? [...COLUNAS_MEMBROS, COLUNA_DE_ACOES] : COLUNAS_MEMBROS}
      vazio={
        membros.length === 0 && <EstadoVazio mensagem="Nenhuma pessoa neste grupo ainda." />
      }
    >
      {membros.map((m) => (
        <LinhaDeMembro
          key={m.email}
          membro={m}
          /* 🔴 `subgrupo_nomes` vem NA PESSOA, resolvido pelo servidor pra
             página pedida. Antes a tela baixava o catálogo inteiro de
             subgrupos só pra traduzir id em nome -- e enquanto ele não
             chegava, a coluna ficava VAZIA (o `.filter(Boolean)` descartava
             os ids não encontrados), sugerindo que a pessoa não está em
             subgrupo nenhum. */
          subgruposNomes={(m.subgrupo_nomes || []).join(", ")}
          podeEditar={podeEditar}
          onEditar={onEditar}
        />
      ))}
    </Tabela>
  );
}
