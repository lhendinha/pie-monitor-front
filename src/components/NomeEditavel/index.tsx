import { Input, Text } from "@chakra-ui/react";
import { useState, type KeyboardEvent } from "react";

interface Props {
  nome: string;
  /** Como chamar o campo pra quem usa leitor de tela: "Novo nome de Cível".
   * O rótulo visível é o próprio nome, que some quando o campo aparece. */
  rotuloDoCampo?: string;
  /** Em edição, o nome vira campo no lugar (`.subgrupo-name-input`). */
  editando: boolean;
  /** Falso pra quem não tem `admin`: aí o nome é só texto. */
  podeRenomear: boolean;
  onIniciar: () => void;
  onConfirmar: (nome: string) => void;
  onCancelar: () => void;
  /** O rename já foi enviado e a resposta não voltou.
   *
   * Sem isto, confirmar não mudava NADA na tela: o campo seguia editável,
   * com o texto novo, e a pessoa não sabia se o Enter tinha pegado. Fica em
   * leitura, apagado, até a linha voltar a ser texto. */
  salvando?: boolean;
}

/** Um nome numa linha de lista -- e o campo que ele vira ao ser clicado.
 *
 * Renomear é trocar uma palavra: no artifact isso acontece na própria
 * linha, sem modal. Enter confirma, Escape desiste, e sair do campo
 * confirma também (é o que se espera de edição no lugar).
 *
 * Serve subgrupo e opção de processo (fase, situação) -- as duas telas
 * renomeiam do mesmo jeito.
 */
export default function NomeEditavel({
  nome,
  rotuloDoCampo,
  editando,
  podeRenomear,
  onIniciar,
  onConfirmar,
  onCancelar,
  salvando,
}: Props) {
  const [rascunho, setRascunho] = useState(nome);

  /** Nome vazio não apaga o que já existe: sem texto, sair do campo é
   * desistir -- e não renomear o subgrupo pra "". Igual quando o texto
   * voltou a ser o mesmo: não há o que salvar. */
  function confirmar() {
    // ⚠️ Sem esta saída, o `onBlur` do campo em leitura reenviava o mesmo
    // rename enquanto o primeiro ainda estava em voo.
    if (salvando) return;
    const limpo = rascunho.trim();
    if (!limpo || limpo === nome) onCancelar();
    else onConfirmar(limpo);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmar();
    }
    if (e.key === "Escape") onCancelar();
  }

  if (editando) {
    return (
      <Input
        aria-label={rotuloDoCampo || `Novo nome de ${nome}`}
        value={rascunho}
        onChange={(e) => setRascunho(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={confirmar}
        readOnly={salvando}
        opacity={salvando ? 0.6 : 1}
        autoFocus
        fontSize="13.5px"
        fontWeight="700"
        px="7px"
        py="3px"
        h="auto"
        w="auto"
        flex="0 1 260px"
        borderWidth="1px"
        borderStyle="solid"
        borderColor="brand"
        borderRadius="5px"
      />
    );
  }

  return (
    <Text
      as="span"
      fontSize="13.5px"
      fontWeight="700"
      cursor={podeRenomear ? "pointer" : "default"}
      onClick={podeRenomear ? onIniciar : undefined}
    >
      {nome}
    </Text>
  );
}
