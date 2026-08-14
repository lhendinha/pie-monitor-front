import { useState, type FormEvent } from "react";
import { aceitarConvite } from "../../services";
import { useToast } from "../../components";

interface AceitarConvitePageProps {
  token: string;
}

export default function AceitarConvitePage({ token }: AceitarConvitePageProps) {
  const [apelido, setApelido] = useState("");
  const [password, setPassword] = useState("");
  const [campoInvalido, setCampoInvalido] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const toast = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setCampoInvalido(false);
    setEnviando(true);
    try {
      await aceitarConvite(token, password, apelido.trim() || undefined);
      setSucesso(true);
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (err) {
      setCampoInvalido(true);
      toast.erro(err instanceof Error ? err.message : "Não foi possível aceitar o convite.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="app">
      <header className="masthead">
        <p className="masthead-eyebrow">Convite</p>
        <h1 className="masthead-title">Criar sua conta</h1>
        <p className="masthead-sub">Escolha uma senha pra entrar no grupo.</p>
      </header>

      {sucesso ? (
        <div className="banner banner-ok">Conta criada! Redirecionando…</div>
      ) : (
        <div className="gate">
          <form className="form-row" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="apelido">Apelido (opcional)</label>
              <input
                id="apelido"
                value={apelido}
                onChange={(e) => setApelido(e.target.value)}
                placeholder="como quer ser chamado"
              />
            </div>
            <div className={`field${campoInvalido ? " field-error" : ""}`}>
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setCampoInvalido(false);
                }}
                placeholder="mínimo 8 caracteres"
              />
            </div>
            <button className="btn" type="submit" disabled={enviando || password.length < 8}>
              {enviando ? "Criando…" : "Criar conta"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
