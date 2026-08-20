import { useState, type FormEvent } from "react";
import { ApiError, aceitarConvite } from "../../services";
import { useToast } from "../../components";

interface AceitarConvitePageProps {
  token: string;
}

export default function AceitarConvitePage({ token }: AceitarConvitePageProps) {
  const [apelido, setApelido] = useState("");
  const [password, setPassword] = useState("");
  const [campoInvalido, setCampoInvalido] = useState(false);
  const [linkInvalido, setLinkInvalido] = useState(false);
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
      // Achado 19: link já usado/expirado (410) não é "senha errada" --
      // destacar os campos de senha nesse caso confundia o usuário, que
      // tentava senhas diferentes sem nunca conseguir.
      if (err instanceof ApiError && err.status === 410) {
        setLinkInvalido(true);
      } else {
        setCampoInvalido(true);
      }
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
      ) : linkInvalido ? (
        <div className="banner">
          Esse link de convite é inválido ou já foi usado. Peça um novo convite pra quem te convidou.
        </div>
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
                placeholder="Senha deve conter entre 8 e 64 caracteres"
                maxLength={64}
              />
            </div>
            <button className="btn" type="submit" disabled={enviando || password.length < 8 || password.length > 64}>
              {enviando ? "Criando…" : "Criar conta"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
