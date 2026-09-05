import { Box, Flex, Text, chakra } from "@chakra-ui/react";
import { useRef, useState, type ChangeEvent, type DragEvent } from "react";

import { BotaoNu } from "../BotaoNu";
import { IconeX } from "../Icons";
import { TAMANHO_MAXIMO_DE_ARQUIVO, formatarTamanho } from "../../constants/documento";
import type { CampoDeArquivoProps } from "./types";

/** A área de escolher um arquivo: clique ou arrasto.
 *
 * ⚠️ **A recusa por tamanho aqui é conveniência, não a regra.** Quem recusa
 * de verdade é o armazenamento, pela política assinada do envio -- é lá que
 * o teto não depende de nada que roda na máquina de quem envia. Esta serve
 * pra não fazer a pessoa esperar minutos de upload por uma negativa que já
 * dava pra dar na hora.
 *
 * 🔴 O `<input type="file">` fica na árvore e VISUALMENTE escondido, não
 * `display: none` nem substituído por um `click()` avulso: é ele que
 * carrega o rótulo, o foco de teclado e o diálogo nativo. Escondê-lo de
 * verdade tiraria o campo do Tab -- e não há outro caminho pra escolher
 * arquivo sem mouse.
 */
export default function CampoDeArquivo({
  id,
  valor,
  onMudar,
  desabilitado,
}: CampoDeArquivoProps) {
  const entrada = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);
  const [erro, setErro] = useState("");

  function aceitar(arquivo: File | undefined) {
    if (!arquivo) return;
    if (arquivo.size > TAMANHO_MAXIMO_DE_ARQUIVO) {
      setErro(
        `Este arquivo tem ${formatarTamanho(arquivo.size)}. O limite é ${formatarTamanho(
          TAMANHO_MAXIMO_DE_ARQUIVO,
        )}.`,
      );
      return;
    }
    // ⚠️ Arquivo de zero byte é recusado aqui e no armazenamento (a política
    // começa em 1 byte, não em 0). Sem isto, ele viraria um documento que
    // baixa em branco -- sem erro em lugar nenhum.
    if (arquivo.size === 0) {
      setErro("Este arquivo está vazio.");
      return;
    }
    setErro("");
    onMudar(arquivo);
  }

  function aoEscolher(e: ChangeEvent<HTMLInputElement>) {
    aceitar(e.target.files?.[0]);
  }

  function aoSoltar(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setArrastando(false);
    if (desabilitado) return;
    aceitar(e.dataTransfer.files?.[0]);
  }

  function limpar() {
    onMudar(null);
    setErro("");
    /* 🔴 Zera o `value` do input. Sem isto, escolher o MESMO arquivo depois
       de removê-lo não dispara `change` -- o navegador compara com o valor
       anterior, que continuava lá. O campo ficava mudo, e parecia defeito
       do arquivo. */
    if (entrada.current) entrada.current.value = "";
  }

  if (valor) {
    return (
      /* `relative` ancora o input escondido de 1x1 -- solto, ele se
         posicionaria pelo ancestral posicionado mais próximo e poderia
         parar fora da viewport, criando rolagem por um pixel invisível. */
      <Box position="relative">
        <Flex
          align="center"
          gap="10px"
          px="12px"
          py="10px"
          borderWidth="1px"
          borderColor="border"
          borderRadius="md"
          bg="bg.canvas"
        >
          <Box minW="0" flex="1">
            <Text fontSize="13px" fontWeight="700" color="fg" truncate>
              {valor.name}
            </Text>
            <Text fontSize="11.5px" color="fg.subtle">
              {formatarTamanho(valor.size)}
            </Text>
          </Box>
          <BotaoNu
            type="button"
            aria-label={`Remover ${valor.name}`}
            onClick={limpar}
            disabled={desabilitado}
            display="flex"
            color="fg.subtle"
            _hover={{ color: "status.bad" }}
            css={{ "& svg": { width: "12px", height: "12px" } }}
          >
            <IconeX />
          </BotaoNu>
        </Flex>
        {/* O input continua montado E alcançável, escondido pela mesma
            técnica de cima -- não `display: none`.
            🔴 É ele que o rótulo "Arquivo" do `Campo` aponta: com
            `display: none`, clicar no rótulo não faria nada e trocar o
            arquivo escolhido exigiria removê-lo antes. Assim, clicar em
            "Arquivo" (ou chegar por Tab) abre o diálogo e troca direto. */}
        <input
          ref={entrada}
          id={id}
          type="file"
          onChange={aoEscolher}
          disabled={desabilitado}
          style={{ position: "absolute", width: "1px", height: "1px", opacity: 0, overflow: "hidden" }}
        />
      </Box>
    );
  }

  return (
    <Box position="relative">
      <Box
        onDragOver={(e) => {
          e.preventDefault();
          if (!desabilitado) setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={aoSoltar}
        borderWidth="1px"
        borderStyle="dashed"
        borderColor={arrastando ? "fg.brand" : "border"}
        bg={arrastando ? "bg.brand.subtle" : "bg.canvas"}
        borderRadius="md"
        transition="background 120ms, border-color 120ms"
        opacity={desabilitado ? 0.6 : 1}
      >
        {/* O rótulo ENVOLVE o input: clicar em qualquer ponto da área abre o
            diálogo, sem `click()` programático.
            ⚠️ Sem `htmlFor` -- o input está dentro, e a associação implícita
            já vale. Com `htmlFor` apontando pro mesmo id, o campo ficaria com
            dois rótulos explícitos (este e o do `Campo`, que também aponta
            pra cá) e o leitor de tela leria os dois em sequência. */}
        <chakra.label
          display="flex"
          flexDirection="column"
          alignItems="center"
          gap="4px"
          textAlign="center"
          px="16px"
          py="22px"
          cursor={desabilitado ? "not-allowed" : "pointer"}
          _focusWithin={{ outline: "2px solid", outlineColor: "fg.brand", outlineOffset: "-2px" }}
        >
          <Text fontSize="13px" fontWeight="700" color="fg">
            Clique para escolher ou arraste o arquivo aqui
          </Text>
          <Text fontSize="11.5px" color="fg.subtle">
            Qualquer formato, até {formatarTamanho(TAMANHO_MAXIMO_DE_ARQUIVO)}
          </Text>
          {/* Visualmente escondido, mas presente no Tab e na árvore de
              acessibilidade -- ver o comentário do componente. */}
          <input
            ref={entrada}
            id={id}
            type="file"
            onChange={aoEscolher}
            disabled={desabilitado}
            style={{
              position: "absolute",
              width: "1px",
              height: "1px",
              opacity: 0,
              overflow: "hidden",
            }}
          />
        </chakra.label>
      </Box>

      {erro && (
        <Text fontSize="11.5px" color="status.bad" mt="5px" role="alert">
          {erro}
        </Text>
      )}
    </Box>
  );
}
