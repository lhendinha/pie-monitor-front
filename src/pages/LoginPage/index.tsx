import { Box, Input, Stack, Text } from "@chakra-ui/react";
import { useState, type FormEvent } from "react";

import {
  Botao,
  BotaoDeLink,
  Campo,
  CampoDeSenha,
  CartaoDeAutenticacao,
  Faixa,
  useToast,
} from "../../components";
import { login } from "../../services";

interface Props {
  /** Recado que chega junto com a tela -- hoje só "sua sessão expirou".
   * Vai DENTRO do cartão porque é sobre este login: solto acima dele
   * parecia aviso do site inteiro. */
  aviso?: string;
  onEntrar: () => void;
  onEsqueciSenha: () => void;
}

export default function LoginPage({ aviso, onEntrar, onEsqueciSenha }: Props) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const toast = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      await login(email.trim().toLowerCase(), senha);
      onEntrar();
    } catch (err) {
      /** Marca os dois campos sem dizer qual está errado, e repete a
       * mensagem do servidor -- que também não distingue e-mail
       * inexistente de senha errada. Dizer "esse e-mail não existe"
       * entregaria quem tem conta aqui a quem estiver testando endereços. */
      setErro("E-mail ou senha incorretos.");
      toast.erro(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <CartaoDeAutenticacao titulo="Entrar">
      {aviso && (
        <Box mb="16px">
          <Faixa tom="aviso" aEsquerda>
            {aviso}
          </Faixa>
        </Box>
      )}

      <form onSubmit={handleSubmit}>
        <Campo rotulo="E-mail" para="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErro("");
            }}
            autoFocus
          />
        </Campo>

        <Campo rotulo="Senha" para="senha" erro={erro || undefined}>
          <CampoDeSenha
            id="senha"
            valor={senha}
            onMudar={(v) => {
              setSenha(v);
              setErro("");
            }}
            autoComplete="current-password"
          />
        </Campo>

        <Botao type="submit" w="100%" justifyContent="center" disabled={enviando || !email.trim() || !senha}>
          {enviando ? "Entrando…" : "Entrar"}
        </Botao>
      </form>

      <Stack align="center" mt="16px">
        <Text>
          <BotaoDeLink type="button" onClick={onEsqueciSenha}>
            Esqueci minha senha
          </BotaoDeLink>
        </Text>
      </Stack>
    </CartaoDeAutenticacao>
  );
}
