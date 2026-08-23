import { Flex, Text } from "@chakra-ui/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  BotaoNu,
  BotaoQuadrado,
  IconeArrastar,
  IconeLapis,
  IconeOlho,
  IconeOlhoCortado,
  LinhaDeLista,
  NomeEditavel,
} from "../../../../components";
import type { OpcaoProcesso } from "../../../../types";

interface Props {
  opcao: OpcaoProcesso;
  /** Falso pra quem não tem `admin`: a linha vira só leitura, sem arrastar
   * e sem ações. */
  podeGerenciar: boolean;
  editando: boolean;
  onIniciarRenome: () => void;
  onRenomear: (rotulo: string) => void;
  onCancelarRenome: () => void;
  onDesativar: () => void;
  onReativar: () => void;
}

/** Uma opção de Fase ou Situação na lista.
 *
 * A alça de arrastar é um botão de verdade, e não a linha inteira: o
 * `dnd-kit` liga navegação por teclado nela (Espaço pega, setas movem), e
 * arrastar a linha toda tiraria o clique do nome, que é como se renomeia.
 */
export default function LinhaDeOpcao({
  opcao,
  podeGerenciar,
  editando,
  onIniciarRenome,
  onRenomear,
  onCancelarRenome,
  onDesativar,
  onReativar,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: opcao.opcao_id,
    disabled: !podeGerenciar,
  });

  return (
    <Flex
      ref={setNodeRef}
      direction="column"
      style={{ transform: CSS.Transform.toString(transform), transition }}
      opacity={isDragging ? 0.5 : 1}
    >
      <LinhaDeLista
        icone={
          podeGerenciar ? (
            <BotaoNu
              type="button"
              title="Arraste pra reordenar"
              aria-label={`Reordenar ${opcao.rotulo}`}
              display="flex"
              color="fg.subtle"
              cursor="grab"
              _active={{ cursor: "grabbing" }}
              {...attributes}
              {...listeners}
            >
              <IconeArrastar />
            </BotaoNu>
          ) : (
            <IconeArrastar />
          )
        }
        acoes={
          podeGerenciar && (
            <>
              <BotaoQuadrado
                type="button"
                title="Renomear"
                aria-label={`Renomear ${opcao.rotulo}`}
                onClick={onIniciarRenome}
              >
                <IconeLapis />
              </BotaoQuadrado>
              {opcao.ativo ? (
                <BotaoQuadrado
                  type="button"
                  tom="perigo"
                  title="Desativar"
                  aria-label={`Desativar ${opcao.rotulo}`}
                  onClick={onDesativar}
                >
                  <IconeOlhoCortado />
                </BotaoQuadrado>
              ) : (
                <BotaoQuadrado
                  type="button"
                  title="Reativar"
                  aria-label={`Reativar ${opcao.rotulo}`}
                  onClick={onReativar}
                >
                  <IconeOlho />
                </BotaoQuadrado>
              )}
            </>
          )
        }
      >
        {/* Inativa fica em cinza E escrito: cor sozinha não conta a história
            pra quem não a distingue, e "(Inativa)" é curto o bastante pra
            caber na linha. */}
        <Flex align="center" gap="6px" color={opcao.ativo ? undefined : "fg.subtle"}>
          <NomeEditavel
            key={opcao.rotulo}
            nome={opcao.rotulo}
            rotuloDoCampo={`Novo rótulo de ${opcao.rotulo}`}
            editando={editando}
            podeRenomear={podeGerenciar}
            onIniciar={onIniciarRenome}
            onConfirmar={onRenomear}
            onCancelar={onCancelarRenome}
          />
          {!opcao.ativo && !editando && (
            <Text fontSize="12px" fontWeight="600">
              (Inativa)
            </Text>
          )}
        </Flex>
      </LinhaDeLista>
    </Flex>
  );
}
