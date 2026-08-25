import { Input, Text } from "@chakra-ui/react";
import { useEffect, useState, type KeyboardEvent, useRef } from "react";

interface NomeEditavelProps {
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
  /** O servidor recusou o último rename (nome duplicado, por exemplo).
   *
   * O campo continua aberto pra correção -- mas sair dele sem mudar o texto
   * passa a ser "desisti" em vez de reenviar o mesmo pedido que já falhou. */
  falhou?: boolean;
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
  falhou = false,
  salvando,
}: NomeEditavelProps) {
  const [rascunho, setRascunho] = useState(nome);

  /** 🔴 Ressincroniza o rascunho a cada vez que a edição ABRE.
   *
   * O componente é renderizado sempre (editando ou não) por `LinhaDeOpcao`,
   * `ListaDeSubgrupos` e `LinhaDeColuna`, então a instância sobrevive entre
   * edições -- e o `useState(nome)` só valia na primeira montagem.
   *
   * Sem isto: a pessoa digitava "Trabalhista" sobre "Cível", apertava
   * Escape (desistiu), clicava no nome de novo, e o campo reabria com
   * "Trabalhista". Sair do campo sem tocar em nada disparava o `onBlur` ->
   * `confirmar()` -> e o rename que ela cancelou era COMITADO. Valia pra
   * subgrupo, fase e coluna. */
  useEffect(() => {
    if (editando) setRascunho(nome);
  }, [editando, nome]);

  /** Nome vazio não apaga o que já existe: sem texto, sair do campo é
   * desistir -- e não renomear o subgrupo pra "". Igual quando o texto
   * voltou a ser o mesmo: não há o que salvar. */
  /** O último rascunho que o servidor recusou.
   *
   * 🔴 Sem isto, um rename rejeitado (nome duplicado -> 409) entrava em
   * laço: o campo fica aberto de propósito, pra pessoa corrigir a digitação,
   * mas o rascunho continua DIFERENTE do nome atual -- então cada clique
   * fora disparava `onBlur` -> `confirmar()` -> o mesmo 409, indefinidamente.
   * Só Escape ou editar o texto quebrava.
   *
   * Guardando o que foi recusado, sair do campo sem mudar nada passa a ser
   * "desisti", como já é quando o texto voltou ao original. Reenviar exige
   * um gesto explícito: Enter, ou trocar o texto. */
  /** O texto que ENVIAMOS, e o que voltou recusado. */
  const enviadoRef = useRef<string | null>(null);
  const recusadoRef = useRef<string | null>(null);

  /* ⚠️ Depende só de `falhou`, e guarda o que foi ENVIADO.
   *
   * 🔴 A primeira versão tinha `rascunho` nas dependências e gravava
   * `rascunho.trim()`. Enquanto `falhou` fosse true, cada TECLA regravava o
   * recusado com o que estava sendo digitado -- e aí `confirmar()` sempre
   * caía no ramo de cancelar. Depois de um único 409, Enter e clique fora
   * DESCARTAVAM o rename em silêncio, em todas as linhas, pra sempre.
   * Consertar o laço quebrou a funcionalidade inteira.
   *
   * O que precisa ser lembrado é o texto que o servidor recusou, não o que
   * a pessoa está escrevendo agora. */
  useEffect(() => {
    if (falhou) recusadoRef.current = enviadoRef.current;
  }, [falhou]);

  /** `"enter"` é gesto EXPLÍCITO; `"blur"` é ambíguo -- e a diferença
   * decide se o texto já recusado é reenviado.
   *
   * 🔴 A versão anterior aplicava a guarda aos dois. `falhou` vem de
   * `mutation.isError`, que é true pra QUALQUER falha -- não só o 409 de
   * nome duplicado pro qual a guarda foi escrita. Depois de um blip de
   * rede, apertar Enter com o mesmo texto caía no ramo de cancelar: nenhum
   * pedido, nenhuma mensagem, e o nome ficava inalcançável pra sempre a
   * menos que a pessoa mudasse o texto.
   *
   * Separando por origem, não é preciso classificar o erro: sair do campo
   * não reenvia (era daí que vinha o laço), e Enter sempre reenvia, porque
   * quem aperta Enter está pedindo de novo de propósito. */
  function confirmar(origem: "enter" | "blur") {
    // ⚠️ Sem esta saída, o `onBlur` do campo em leitura reenviava o mesmo
    // rename enquanto o primeiro ainda estava em voo.
    if (salvando) return;
    const limpo = rascunho.trim();
    if (!limpo || limpo === nome) {
      onCancelar();
      return;
    }
    if (origem === "blur" && limpo === recusadoRef.current) {
      onCancelar();
      return;
    }
    enviadoRef.current = limpo;
    onConfirmar(limpo);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmar("enter");
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
        onBlur={() => confirmar("blur")}
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
