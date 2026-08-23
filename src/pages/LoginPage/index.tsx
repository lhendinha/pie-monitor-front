import { Box, Input, Stack, Text } from "@chakra-ui/react";
import { useState, type FormEvent } from "react";

import {
  Botao,
  BotaoDeLink,
  Campo,
  CampoDeSenha,
  CartaoDeAutenticacao,
  Faixa,
} from "../../components";
import { login } from "../../services";
import { avisoDeTentativas } from "./helpers/avisoDeTentativas";
import type { AlertaDoLogin } from "./types";

interface LoginPageProps {
  /** Recado que chega junto com a tela -- hoje só "sua sessão expirou".
   * Vai DENTRO do cartão porque é sobre este login: solto acima dele
   * parecia aviso do site inteiro. */
  aviso?: string;
  onEntrar: () => void;
  onEsqueciSenha: () => void;
}

export default function LoginPage({ aviso, onEntrar, onEsqueciSenha }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  /** O recado sobre o bloqueio: quantas tentativas restam, ou que a próxima
   * já é recusada. Separado do `erro` porque é SECUNDÁRIO a ele -- o que
   * deu errado continua sendo a mensagem principal. */
  const [alerta, setAlerta] = useState<AlertaDoLogin | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setAlerta(null);
    setEnviando(true);
    try {
      await login(email.trim().toLowerCase(), senha);
      onEntrar();
    } catch (err) {
      /** Nunca diz QUAL dos dois está errado -- nem o servidor distingue
       * e-mail inexistente de senha errada. "Esse e-mail não existe"
       * entregaria quem tem conta aqui a quem estiver testando endereços. */
      const resultado = avisoDeTentativas(err);
      setErro(resultado.erro);
      setAlerta(
        resultado.alerta
          ? { texto: resultado.alerta, ofereceRecuperacao: Boolean(resultado.ofereceRecuperacao) }
          : resultado.ofereceRecuperacao
            ? { texto: resultado.erro, ofereceRecuperacao: true }
            : null,
      );
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

      {alerta && (
        <Box mb="16px">
          <Faixa tom="aviso" aEsquerda>
            {alerta.texto}
            {/* Redefinir a senha destrava o login na hora, mesmo bloqueado.
                Sem este atalho, a saída existe e ninguém encontra. */}
            {alerta.ofereceRecuperacao && (
              <Text mt="6px" fontWeight="500">
                <BotaoDeLink type="button" onClick={onEsqueciSenha}>
                  Redefinir minha senha agora
                </BotaoDeLink>
              </Text>
            )}
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
