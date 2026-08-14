import { useState, type FormEvent } from "react";
import { solicitarRecuperacaoSenha } from "../../services";
import { useToast } from "../../components";

interface EsqueciSenhaPageProps {
  onVoltar: () => void;
}

export default function EsqueciSenhaPage({ onVoltar }: EsqueciSenhaPageProps) {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const toast = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      await solicitarRecuperacaoSenha(email.trim().toLowerCase());
      // Sempre a mesma mensagem, exista ou não o e-mail -- o backend também não revela.
      setEnviado(true);
    } catch (err) {
      toast.erro(err instanceof Error ? err.message : "Não foi possível processar o pedido.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="gate">
      <h2>Recuperar senha</h2>
      {enviado ? (
        <p>Se esse e-mail existir, você vai receber um link de recuperação em instantes.</p>
      ) : (
        <>
          <p>Informe o e-mail da sua conta pra receber um link de redefinição de senha.</p>
          <form className="form-row" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email-recuperacao">E-mail</label>
              <input
                id="email-recuperacao"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button className="btn" type="submit" disabled={enviando || !email.trim()}>
              {enviando ? "Enviando…" : "Enviar link"}
            </button>
          </form>
        </>
      )}
      <p className="gate-link">
        <button type="button" className="link-button" onClick={onVoltar}>
          Voltar pro login
        </button>
      </p>
    </div>
  );
}
