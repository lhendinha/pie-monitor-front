import { Box, Input } from "@chakra-ui/react";
import { useState } from "react";

import { BotaoNu } from "../BotaoNu";
import { IconeOlho, IconeOlhoCortado } from "../Icons";
import { TAMANHO_MAXIMO_DA_SENHA } from "../../constants";

interface Props {
  id: string;
  valor: string;
  onMudar: (valor: string) => void;
  placeholder?: string;
  /** `current-password` pra entrar, `new-password` pra criar ou trocar --
   * é o que faz o gerenciador de senhas oferecer a coisa certa. */
  autoComplete: "current-password" | "new-password";
  autoFocus?: boolean;
}

/** Campo de senha com o olho de mostrar/ocultar (`.olho-btn` do artifact).
 *
 * Existe porque digitar senha às cegas é a causa mais comum de "minha senha
 * está errada" -- e o custo de errar aqui é alto: no convite e na
 * redefinição, a pessoa só descobre depois de enviar.
 */
export default function CampoDeSenha({
  id,
  valor,
  onMudar,
  placeholder,
  autoComplete,
  autoFocus,
}: Props) {
  const [visivel, setVisivel] = useState(false);
  const rotulo = visivel ? "Ocultar senha" : "Mostrar senha";

  return (
    <Box position="relative">
      <Input
        id={id}
        type={visivel ? "text" : "password"}
        value={valor}
        onChange={(e) => onMudar(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        maxLength={TAMANHO_MAXIMO_DA_SENHA}
        pr="42px"
      />
      <BotaoNu
        type="button"
        title={rotulo}
        aria-label={rotulo}
        aria-pressed={visivel}
        onClick={() => setVisivel((v) => !v)}
        position="absolute"
        right="8px"
        top="50%"
        transform="translateY(-50%)"
        display="flex"
        alignItems="center"
        justifyContent="center"
        w="28px"
        h="28px"
        borderRadius="sm"
        color="fg.subtle"
        _hover={{ bg: "border.subtle", color: "fg" }}
        css={{ "& svg": { width: "15px", height: "15px" } }}
      >
        {visivel ? <IconeOlhoCortado /> : <IconeOlho />}
      </BotaoNu>
    </Box>
  );
}
