import { Text } from "@chakra-ui/react";

import {
  BotaoQuadrado,
  IconeGrupo,
  IconeLapis,
  IconeLixeira,
  LinhaDeLista,
} from "../../../../components";
import { contar } from "../../../../utils";
import NomeDoSubgrupo from "../NomeDoSubgrupo";
import type { Subgrupo } from "../../../../types";

interface Props {
  subgrupos: Subgrupo[];
  podeEditar: boolean;
  podeExcluir: boolean;
  /** Qual linha está com o nome em edição -- só uma por vez. */
  renomeandoId: string | null;
  onIniciarRenome: (s: Subgrupo) => void;
  onRenomear: (s: Subgrupo, nome: string) => void;
  onCancelarRenome: () => void;
  onRemover: (s: Subgrupo) => void;
}

export default function ListaDeSubgrupos({
  subgrupos,
  podeEditar,
  podeExcluir,
  renomeandoId,
  onIniciarRenome,
  onRenomear,
  onCancelarRenome,
  onRemover,
}: Props) {
  if (subgrupos.length === 0) {
    return (
      <Text py="34px" px="10px" textAlign="center" color="fg.subtle">
        Nenhum subgrupo ainda.
      </Text>
    );
  }

  return (
    <>
      {subgrupos.map((s) => (
        <LinhaDeLista
          key={s.subgrupo_id}
          icone={<IconeGrupo />}
          acoes={
            <>
              {podeEditar && (
                <BotaoQuadrado
                  type="button"
                  title="Renomear"
                  aria-label={`Renomear ${s.nome}`}
                  onClick={() => onIniciarRenome(s)}
                >
                  <IconeLapis />
                </BotaoQuadrado>
              )}
              {podeExcluir && (
                <BotaoQuadrado
                  type="button"
                  tom="perigo"
                  title="Excluir subgrupo"
                  aria-label={`Remover ${s.nome}`}
                  onClick={() => onRemover(s)}
                >
                  <IconeLixeira />
                </BotaoQuadrado>
              )}
            </>
          }
        >
          <NomeDoSubgrupo
            /* A chave inclui o nome pra o rascunho nascer do valor atual:
               renomeado e reaberto, o campo tem que vir com o nome novo. */
            key={s.nome}
            nome={s.nome}
            editando={renomeandoId === s.subgrupo_id}
            podeRenomear={podeEditar}
            onIniciar={() => onIniciarRenome(s)}
            onConfirmar={(nome) => onRenomear(s, nome)}
            onCancelar={onCancelarRenome}
          />
          {/* "3 membros · 3 colunas": contagens que a API já devolve. Sem
              elas a linha seria só um nome, e a tela não diria nada sobre o
              que existe dentro de cada subgrupo. */}
          <Text fontSize="12px" color="fg.subtle">
            {contar(s.membros ?? 0, "membro", "membros")} ·{" "}
            {contar(s.colunas ?? 0, "coluna", "colunas")}
          </Text>
        </LinhaDeLista>
      ))}
    </>
  );
}
