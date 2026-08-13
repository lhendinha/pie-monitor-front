import { useState, type FormEvent } from "react";
import { login } from "../../services";

interface LoginPageProps {
  onEntrar: () => void;
}

export default function LoginPage({ onEntrar }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await login(username.trim().toLowerCase(), password);
      onEntrar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="gate">
      <h2>Entrar</h2>
      <p>O cadastro é feito manualmente (bootstrap) ou por convite de um admin do grupo.</p>
      <form className="form-row" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="username">Usuário</label>
          <input
            id="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="btn" type="submit" disabled={enviando || !username.trim() || !password}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
      {erro && <div className="banner">{erro}</div>}
    </div>
  );
}
