import { useState, type FormEvent } from "react";
import { ApiError, redefinirSenha } from "../../services";
import { useToast } from "../../components";

interface RedefinirSenhaPageProps {
  token: string;
}

export default function RedefinirSenhaPage({ token }: RedefinirSenhaPageProps) {
  const [password, setPassword] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [campoInvalido, setCampoInvalido] = useState(false);
  const [linkInvalido, setLinkInvalido] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const toast = useToast();

  const senhasDiferentes = confirmacao.length > 0 && password !== confirmacao;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (senhasDiferentes) {
      setCampoInvalido(true);
      toast.erro("As senhas não coincidem.");
      return;
    }
    setCampoInvalido(false);
    setEnviando(true);
    try {
      await redefinirSenha(token, password);
      setSucesso(true);
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (err) {
      // Achado 19: link já usado/expirado (410) não é "senha errada" --
      // destacar os campos de senha nesse caso confundia o usuário, que
      // tentava senhas diferentes sem nunca conseguir.
      if (err instanceof ApiError && err.status === 410) {
        setLinkInvalido(true);
      } else {
        setCampoInvalido(true);
      }
      toast.erro(err instanceof Error ? err.message : "Não foi possível redefinir a senha.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="app">
      <header className="masthead">
        <p className="masthead-eyebrow">Recuperação de senha</p>
        <h1 className="masthead-title">Escolher nova senha</h1>
        <p className="masthead-sub">O link é válido por 1 hora e só funciona uma vez.</p>
      </header>

      {sucesso ? (
        <div className="banner banner-ok">Senha redefinida! Redirecionando…</div>
      ) : linkInvalido ? (
        <div className="banner">
          Esse link de recuperação é inválido ou já foi usado. Peça um novo em "Esqueci minha senha".
        </div>
      ) : (
        <div className="gate">
          <form className="form-row" onSubmit={handleSubmit}>
            <div className={`field${campoInvalido ? " field-error" : ""}`}>
              <label htmlFor="password">Nova senha</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setCampoInvalido(false);
                }}
                placeholder="Senha deve conter entre 8 e 64 caracteres"
                maxLength={64}
              />
            </div>
            <div className={`field${campoInvalido ? " field-error" : ""}`}>
              <label htmlFor="confirmacao">Confirmar senha</label>
              <input
                id="confirmacao"
                type="password"
                value={confirmacao}
                onChange={(e) => {
                  setConfirmacao(e.target.value);
                  setCampoInvalido(false);
                }}
                maxLength={64}
              />
            </div>
            <button className="btn" type="submit" disabled={enviando || password.length < 8 || password.length > 64 || senhasDiferentes}>
              {enviando ? "Salvando…" : "Redefinir senha"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
