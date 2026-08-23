import { Input, Stack, Text } from "@chakra-ui/react";
import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  Botao,
  BotaoDeLink,
  Campo,
  CampoDeSenha,
  CartaoDeAutenticacao,
  Esqueleto,
  Faixa,
  useToast,
} from "../../components";
import { REGRA_DA_SENHA, TAMANHO_MINIMO_DA_SENHA } from "../../constants";
import { ApiError, aceitarConvite, verificarConvite } from "../../services";
import type {
  RespostaDeConvite,
} from "../../types/respostas";

interface AceitarConvitePageProps {
  token: string;
  /** Chamado quando a conta é criada e os tokens já estão salvos. Quem
   * navega é a rota -- a página segue pura, como a de login. */
  onEntrar: () => void;
}

export default function AceitarConvitePage({ token, onEntrar }: AceitarConvitePageProps) {
  /** Confere o link ao ABRIR. Sem isto, a pessoa preenchia apelido e senha,
   * clicava, esperava o round-trip e SÓ ENTÃO lia "Convite expirado" -- uma
   * recusa que já era conhecida quando a página carregou. */
  const conviteQuery = useQuery<RespostaDeConvite>({
    queryKey: ["convite", token],
    queryFn: () => verificarConvite(token),
    enabled: Boolean(token),
    /* Sem retentativa: link inválido não vira válido tentando de novo, e
       cada tentativa segura a tela. */
    retry: false,
  });
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
      /* ⚠️ Era `window.location.href = "/"`, que faz RELOAD COMPLETO do
         SPA: 1,5s parado, depois tela branca enquanto o bundle reparseia,
         e só então a Área de trabalho começa a buscar os dados dela. Com
         `onEntrar` a transição é imediata e a sessão já está no
         localStorage -- é o mesmo caminho do login normal. */
      onEntrar();
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

  if (conviteQuery.isPending) {
    return (
      <CartaoDeAutenticacao titulo="Criar sua conta">
        {/* Só o esqueleto -- mesma razão do formulário de processo. */}
        <Stack gap="14px">
          <Esqueleto linhas={2} altura="38px" />
        </Stack>
      </CartaoDeAutenticacao>
    );
  }

  if (sucesso) {
    return (
      <CartaoDeAutenticacao titulo="Criar sua conta">
        <Faixa tom="ok">Conta criada! Entrando…</Faixa>
      </CartaoDeAutenticacao>
    );
  }

  /* Derivado, e não `setState` no render: o link é inválido se a consulta
     de abertura disse isso OU se o envio tomou 410.

     A consulta FALHAR não é o mesmo que o convite ser inválido -- erro de
     rede não pode virar "convite expirado". Só um `valido: false`
     explícito antecipa o recado; no resto, o formulário abre e quem decide
     é o envio, como antes. */
  const conviteInvalido = linkInvalido || conviteQuery.data?.valido === false;

  if (conviteInvalido) {
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
