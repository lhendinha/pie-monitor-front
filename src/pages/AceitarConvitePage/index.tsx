import { Input, Stack, Text } from "@chakra-ui/react";
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
import { REGRA_DA_SENHA, TAMANHO_MINIMO_DA_SENHA } from "../../constants";
import { ApiError, aceitarConvite } from "../../services";

interface Props {
  token: string;
}

export default function AceitarConvitePage({ token }: Props) {
  const [apelido, setApelido] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [linkInvalido, setLinkInvalido] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const toast = useToast();

  const curtaDemais = senha.length > 0 && senha.length < TAMANHO_MINIMO_DA_SENHA;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      await aceitarConvite(token, senha, apelido.trim() || undefined);
      setSucesso(true);
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (err) {
      /** Convite já usado ou expirado (410) NÃO é senha inválida. Marcar o
       * campo nesse caso fazia a pessoa tentar senhas diferentes sem nunca
       * conseguir -- o que falta é um convite novo. */
      if (err instanceof ApiError && err.status === 410) {
        setLinkInvalido(true);
      } else {
        setErro("Não foi possível criar a conta. Tente de novo.");
      }
      toast.erro(err instanceof Error ? err.message : "Não foi possível aceitar o convite.");
    } finally {
      setEnviando(false);
    }
  }

  if (sucesso) {
    return (
      <CartaoDeAutenticacao titulo="Criar sua conta">
        <Faixa tom="ok">Conta criada! Entrando…</Faixa>
      </CartaoDeAutenticacao>
    );
  }

  if (linkInvalido) {
    return (
      <CartaoDeAutenticacao titulo="Convite expirado">
        <Faixa tom="aviso" aEsquerda>
          Esse link de convite é inválido ou já foi usado. Peça um novo pra quem te convidou.
        </Faixa>
        <Stack align="center" mt="16px">
          <Text>
            <BotaoDeLink type="button" onClick={() => (window.location.href = "/")}>
              Ir pro login
            </BotaoDeLink>
          </Text>
        </Stack>
      </CartaoDeAutenticacao>
    );
  }

  return (
    <CartaoDeAutenticacao
      titulo="Criar sua conta"
      subtitulo="Você foi convidado pro Argos. Defina sua senha pra entrar."
    >
      <form onSubmit={handleSubmit}>
        {/* Opcional de verdade: sem apelido, o sistema usa o e-mail. Quem
            está entrando pela primeira vez não deve travar num campo que
            pode preencher depois, no perfil. */}
        <Campo rotulo="Apelido (opcional)" para="apelido">
          <Input
            id="apelido"
            value={apelido}
            onChange={(e) => setApelido(e.target.value)}
            placeholder="Como quer ser chamado"
            autoComplete="nickname"
            autoFocus
          />
        </Campo>

        <Campo
          rotulo="Senha"
          para="senha-convite"
          obrigatorio
          dica={REGRA_DA_SENHA}
          erro={curtaDemais ? REGRA_DA_SENHA : erro || undefined}
        >
          <CampoDeSenha
            id="senha-convite"
            valor={senha}
            onMudar={(v) => {
              setSenha(v);
              setErro("");
            }}
            autoComplete="new-password"
          />
        </Campo>

        <Botao
          type="submit"
          w="100%"
          justifyContent="center"
          disabled={enviando || senha.length < TAMANHO_MINIMO_DA_SENHA}
        >
          {enviando ? "Criando…" : "Criar conta e entrar"}
        </Botao>
      </form>
    </CartaoDeAutenticacao>
  );
}
