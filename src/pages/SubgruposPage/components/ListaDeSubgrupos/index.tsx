import { Text } from "@chakra-ui/react";

import {
  BotaoNu,
  BotaoQuadrado,
  EstadoVazio,
  IconeGrupo,
  IconeLapis,
  IconeLixeira,
  LinhaDeLista,
  NomeEditavel,
} from "../../../../components";
import { contar } from "../../../../utils";
import type { Subgrupo } from "../../../../types";

interface ListaDeSubgruposProps {
  subgrupos: Subgrupo[];
  podeEditar: boolean;
  /** Por LINHA, e não por papel: um manager exclui o subgrupo que ele mesmo
   * criou e nenhum outro, então a lixeira aparece em algumas linhas e não
   * em outras da mesma lista. */
  podeExcluir: (s: Subgrupo) => boolean;
  /** Qual linha está com o nome em edição -- só uma por vez. */
  renomeandoId: string | null;
  /** O rename da linha em edição já foi enviado. Como só uma edita por vez,
   * um booleano basta -- não precisa dizer qual. */
  renomeando?: boolean;
  /** O último rename foi recusado -- ver `NomeEditavel.falhou`. */
  renomeFalhou?: boolean;
  onIniciarRenome: (s: Subgrupo) => void;
  onRenomear: (s: Subgrupo, nome: string) => void;
  onCancelarRenome: () => void;
  onVerMembros: (s: Subgrupo) => void;
  onRemover: (s: Subgrupo) => void;
}

export default function ListaDeSubgrupos({
  subgrupos,
  podeEditar,
  podeExcluir,
  renomeandoId,
  renomeando,
  renomeFalhou,
  onIniciarRenome,
  onRenomear,
  onCancelarRenome,
  onVerMembros,
  onRemover,
}: ListaDeSubgruposProps) {
  if (subgrupos.length === 0) return <EstadoVazio mensagem="Nenhum subgrupo ainda." />;

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
              {podeExcluir(s) && (
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
          <NomeEditavel
              falhou={renomeFalhou}
            salvando={renomeando}
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
          {/* A contagem de membros é a PORTA: "3 membros" responde quantos,
              e clicar responde quem. O sublinhado pontilhado anuncia isso
              antes de o mouse chegar -- num toque não há hover, e quem varre
              a tela com o olho não descobre o que só aparece depois.

              Só ela é clicável: "· 3 colunas" fica como texto até o quadro
              Kanban existir, quando vira o link pro quadro. Alvo tem que ser
              exatamente o que ele faz. */}
          <BotaoNu
            type="button"
            aria-label={`Ver membros de ${s.nome}`}
            onClick={() => onVerMembros(s)}
            fontSize="12px"
            color="fg.subtle"
            py="2px"
            textDecoration="underline dotted"
            textDecorationColor="border"
            style={{ textUnderlineOffset: "3px" }}
            _hover={{ color: "brand.dark", textDecoration: "underline", textDecorationColor: "currentColor" }}
          >
            {contar(s.membros ?? 0, "membro", "membros")}
          </BotaoNu>
          <Text fontSize="12px" color="fg.subtle">
            · {contar(s.colunas ?? 0, "coluna", "colunas")}
          </Text>
        </LinhaDeLista>
      ))}
    </>
  );
}
