import { useCallback, useEffect, useState, type FormEvent } from "react";
import { listarMembrosDoSubgrupo, adicionarMembro, removerMembro, ApiError } from "../../services";
import type { Membro, Subgrupo } from "../../types";

interface SubgrupoMembrosProps {
  subgrupo: Subgrupo;
  grupoAlvo: string;
  onErro: (msg: string) => void;
}

export default function SubgrupoMembros({ subgrupo, grupoAlvo, onErro }: SubgrupoMembrosProps) {
  const [membros, setMembros] = useState<Membro[] | null>(null);
  const [novoUsername, setNovoUsername] = useState("");
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(() => {
    listarMembrosDoSubgrupo(subgrupo.subgrupo_id, grupoAlvo)
      .then((d: any) => setMembros(d.membros || []))
      .catch(() => onErro("Não foi possível carregar os membros de " + subgrupo.nome));
  }, [subgrupo, grupoAlvo, onErro]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function handleAdicionar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      await adicionarMembro(subgrupo.subgrupo_id, novoUsername.trim().toLowerCase(), grupoAlvo);
      setNovoUsername("");
      carregar();
    } catch (err) {
      onErro(err instanceof ApiError ? err.message : "Não foi possível adicionar.");
    } finally {
      setEnviando(false);
    }
  }

  async function handleRemover(username: string) {
    try {
      await removerMembro(subgrupo.subgrupo_id, username, grupoAlvo);
      carregar();
    } catch (err) {
      onErro(err instanceof ApiError ? err.message : "Não foi possível remover.");
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
            <li className="simple-row" key={m.username}>
              <div className="simple-row-main">
                <div className="simple-row-title">{m.username}</div>
              </div>
              <button className="icon-btn" title="Remover" onClick={() => handleRemover(m.username)}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <form className="form-row" onSubmit={handleAdicionar}>
        <div className="field">
          <input
            value={novoUsername}
            onChange={(e) => setNovoUsername(e.target.value)}
            placeholder="username pra adicionar"
          />
        </div>
        <button className="btn btn-ghost" type="submit" disabled={enviando || !novoUsername.trim()}>
          + Adicionar
        </button>
      </form>
    </div>
  );
}
