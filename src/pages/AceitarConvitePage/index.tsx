import { useState, type FormEvent } from "react";
import { aceitarConvite } from "../../services";

interface AceitarConvitePageProps {
  token: string;
}

export default function AceitarConvitePage({ token }: AceitarConvitePageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await aceitarConvite(token, username.trim().toLowerCase(), password);
      setSucesso(true);
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível aceitar o convite.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="app">
      <header className="masthead">
        <p className="masthead-eyebrow">Convite</p>
        <h1 className="masthead-title">Criar sua conta</h1>
        <p className="masthead-sub">Escolha um usuário e senha pra entrar no grupo.</p>
      </header>

      {sucesso ? (
        <div className="banner banner-ok">Conta criada! Redirecionando…</div>
      ) : (
        <div className="gate">
          <form className="form-row" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="username">Usuário</label>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="seu-usuario"
              />
            </div>
            <div className="field">
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="mínimo 8 caracteres"
              />
            </div>
            <button className="btn" type="submit" disabled={enviando || !username.trim() || password.length < 8}>
              {enviando ? "Criando…" : "Criar conta"}
            </button>
          </form>
          {erro && <div className="banner">{erro}</div>}
        </div>
      )}
    </div>
  );
}
