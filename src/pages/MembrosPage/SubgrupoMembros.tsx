import { useCallback, useEffect, useState, type FormEvent } from "react";
import { listarMembrosDoSubgrupo, adicionarMembro, removerMembro, ApiError } from "../../services";
import { useToast } from "../../components";
import type { Membro, Subgrupo } from "../../types";

interface SubgrupoMembrosProps {
  subgrupo: Subgrupo;
  grupoAlvo: string;
  apelidoPorEmail: Map<string, string | undefined>;
}

export default function SubgrupoMembros({ subgrupo, grupoAlvo, apelidoPorEmail }: SubgrupoMembrosProps) {
  const [membros, setMembros] = useState<Membro[] | null>(null);
  const [novoEmail, setNovoEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const toast = useToast();

  const carregar = useCallback(() => {
    listarMembrosDoSubgrupo(subgrupo.subgrupo_id, grupoAlvo)
      .then((d: any) => setMembros(d.membros || []))
      .catch(() => toast.erro("Não foi possível carregar os membros de " + subgrupo.nome));
  }, [subgrupo, grupoAlvo, toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function handleAdicionar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      await adicionarMembro(subgrupo.subgrupo_id, novoEmail.trim().toLowerCase(), grupoAlvo);
      setNovoEmail("");
      carregar();
    } catch (err) {
      toast.erro(err instanceof ApiError ? err.message : "Não foi possível adicionar.");
    } finally {
      setEnviando(false);
    }
  }

  async function handleRemover(email: string) {
    try {
      await removerMembro(subgrupo.subgrupo_id, email, grupoAlvo);
      carregar();
    } catch (err) {
      toast.erro(err instanceof ApiError ? err.message : "Não foi possível remover.");
    }
  }

  return (
    <div className="subgrupo-membros-card">
      <h3>{subgrupo.nome}</h3>
      {membros === null ? (
        <p className="muted">carregando…</p>
      ) : membros.length === 0 ? (
        <p className="muted">Nenhum membro ainda.</p>
      ) : (
        <ul className="simple-list">
          {membros.map((m) => (
            <li className="simple-row" key={m.email}>
              <div className="simple-row-main">
                <div className="simple-row-title">{apelidoPorEmail.get(m.email) || m.email}</div>
              </div>
              <button className="icon-btn" title="Remover" onClick={() => handleRemover(m.email)}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <form className="form-row" onSubmit={handleAdicionar}>
        <div className="field">
          <input
            type="email"
            value={novoEmail}
            onChange={(e) => setNovoEmail(e.target.value)}
            placeholder="e-mail pra adicionar"
          />
        </div>
        <button className="btn btn-ghost" type="submit" disabled={enviando || !novoEmail.trim()}>
          + Adicionar
        </button>
      </form>
    </div>
  );
}
