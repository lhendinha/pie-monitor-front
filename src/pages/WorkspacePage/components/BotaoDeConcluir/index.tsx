import { BotaoNu, IconeCheck } from "../../../../components";

interface BotaoDeConcluirProps {
  rotulo: string;
  desabilitado?: boolean;
  onConcluir: () => void;
}

/** O círculo de concluir, à esquerda da tarefa (`.task-check` do artifact).
 *
 * Em repouso é quase invisível -- borda e tique na cor da divisória. Só no
 * hover ele assume a cor da marca. É de propósito: numa lista de dez
 * tarefas, dez círculos berrantes competiriam com os títulos, que são o que
 * se lê.
 */
export default function BotaoDeConcluir({ rotulo, desabilitado, onConcluir }: BotaoDeConcluirProps) {
  return (
    <BotaoNu
      type="button"
      title="Concluir"
      aria-label={rotulo}
      disabled={desabilitado}
      onClick={onConcluir}
      display="flex"
      alignItems="center"
      justifyContent="center"
      w="19px"
      h="19px"
      flex="0 0 auto"
      borderRadius="full"
      borderWidth="2px"
      borderColor="border"
      bg="bg.surface"
      color="border"
      _hover={{ borderColor: "fg.brand", color: "fg.brand" }}
      css={{ "& svg": { width: "11px", height: "11px" } }}
    >
      <IconeCheck />
    </BotaoNu>
  );
}
