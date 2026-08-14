import { useState, type FormEvent } from "react";
import { login } from "../../services";
import { useToast } from "../../components";

interface LoginPageProps {
  onEntrar: () => void;
  onEsqueciSenha: () => void;
}

export default function LoginPage({ onEntrar, onEsqueciSenha }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [campoInvalido, setCampoInvalido] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const toast = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setCampoInvalido(false);
    setEnviando(true);
    try {
      await login(email.trim().toLowerCase(), password);
      onEntrar();
    } catch (err) {
      setCampoInvalido(true);
      toast.erro(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="gate">
      <h2>Entrar</h2>
      <p>O cadastro é feito manualmente (bootstrap) ou por convite de um admin do grupo.</p>
      <form className="form-row" onSubmit={handleSubmit}>
        <div className={`field${campoInvalido ? " field-error" : ""}`}>
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setCampoInvalido(false);
            }}
          />
        </div>
        <div className={`field${campoInvalido ? " field-error" : ""}`}>
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setCampoInvalido(false);
            }}
            maxLength={64}
          />
        </div>
        <button className="btn" type="submit" disabled={enviando || !email.trim() || !password}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
      <p className="gate-link">
        <button type="button" className="link-button" onClick={onEsqueciSenha}>
          Esqueci minha senha
        </button>
      </p>
    </div>
  );
}
