import { Stack, Text } from "@chakra-ui/react";
import { useState, type FormEvent } from "react";

import { Botao, BotaoDeLink, Campo, CampoDeSenha, CartaoDeAutenticacao, Faixa } from "../../components";
import { useToast } from "../../contexts/ToastContext";
import { REGRA_DA_SENHA, TAMANHO_MINIMO_DA_SENHA } from "../../constants";
import { ApiError, redefinirSenha } from "../../services";

interface RedefinirSenhaPageProps {
  token: string;
  /** Senha salva. Quem navega é a rota. */
  onConcluido: () => void;
}

export default function RedefinirSenhaPage({ token, onConcluido }: RedefinirSenhaPageProps) {
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const [linkInvalido, setLinkInvalido] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const toast = useToast();

  const curtaDemais = senha.length > 0 && senha.length < TAMANHO_MINIMO_DA_SENHA;
  const senhasDiferentes = confirmacao.length > 0 && senha !== confirmacao;
  const podeEnviar = senha.length >= TAMANHO_MINIMO_DA_SENHA && senha === confirmacao;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      await redefinirSenha(token, senha);
      setSucesso(true);
      // Mesmo motivo do convite: `window.location.href` recarregava o SPA
      // inteiro depois de 1,5s parado.
      onConcluido();
    } catch (err) {
      /** Link já usado ou expirado (410) NÃO é senha errada. Marcar os
       * campos nesse caso fazia a pessoa tentar senhas diferentes sem
       * nunca conseguir -- o que falta é um link novo. */
      if (err instanceof ApiError && err.status === 410) {
        setLinkInvalido(true);
      } else {
        setErro("Não foi possível salvar. Tente de novo.");
      }
      toast.erro(err instanceof Error ? err.message : "Não foi possível redefinir a senha.");
    } finally {
      setEnviando(false);
    }
  }

  if (sucesso) {
    return (
      <CartaoDeAutenticacao titulo="Escolher nova senha">
        <Faixa tom="ok">Senha redefinida! Redirecionando…</Faixa>
      </CartaoDeAutenticacao>
    );
  }

  if (linkInvalido) {
    return (
      <CartaoDeAutenticacao titulo="Link expirado">
        <Faixa tom="aviso" aEsquerda>
          Esse link de recuperação é inválido ou já foi usado. Peça um novo em “Esqueci minha
          senha”.
        </Faixa>
        <Stack align="center" mt="16px">
          <Text>
            <BotaoDeLink type="button" onClick={() => (window.location.href = "/")}>
              Voltar pro login
            </BotaoDeLink>
          </Text>
        </Stack>
      </CartaoDeAutenticacao>
    );
  }

  return (
    <CartaoDeAutenticacao
      titulo="Escolher nova senha"
      subtitulo="O link é válido por 1 hora e só funciona uma vez."
    >
      <form onSubmit={handleSubmit}>
        <Campo
          rotulo="Nova senha"
          para="nova-senha"
          obrigatorio
          dica={REGRA_DA_SENHA}
          erro={curtaDemais ? REGRA_DA_SENHA : erro || undefined}
        >
          <CampoDeSenha
            id="nova-senha"
            valor={senha}
            onMudar={(v) => {
              setSenha(v);
              setErro("");
            }}
            autoComplete="new-password"
            autoFocus
          />
        </Campo>

        <Campo
          rotulo="Confirmar senha"
          para="confirmar-senha"
          obrigatorio
          erro={senhasDiferentes ? "As senhas não coincidem." : undefined}
        >
          <CampoDeSenha
            id="confirmar-senha"
            valor={confirmacao}
            onMudar={setConfirmacao}
            autoComplete="new-password"
          />
        </Campo>

        <Botao type="submit" w="100%" justifyContent="center" disabled={enviando || !podeEnviar}>
          {enviando ? "Salvando…" : "Redefinir senha"}
        </Botao>
      </form>
    </CartaoDeAutenticacao>
  );
}
