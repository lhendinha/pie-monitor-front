import { useCallback, useEffect, useState, type FormEvent } from "react";
import { listarMembrosDoSubgrupo, adicionarMembro, removerMembro, ApiError } from "../../services";
import { useToast } from "../../components";
import type { Membro, Subgrupo } from "../../types";

interface SubgrupoMembrosProps {
  subgrupo: Subgrupo;
  apelidoPorEmail: Map<string, string | undefined>;
}

export default function SubgrupoMembros({ subgrupo, apelidoPorEmail }: SubgrupoMembrosProps) {
  const [membros, setMembros] = useState<Membro[] | null>(null);
  const [novoEmail, setNovoEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const toast = useToast();

  const carregar = useCallback(() => {
    listarMembrosDoSubgrupo(subgrupo.subgrupo_id)
      .then((d: any) => setMembros(d.membros || []))
      .catch(() => toast.erro("Não foi possível carregar os membros de " + subgrupo.nome));
  }, [subgrupo, toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function handleAdicionar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      const resp = (await adicionarMembro(
        subgrupo.subgrupo_id,
        novoEmail.trim().toLowerCase()
      )) as { mensagem: string; email: string };
      setNovoEmail("");
      carregar();
      toast.sucesso(
        resp.mensagem === "adicionado"
          ? `${resp.email} adicionado ao subgrupo.`
          : `${resp.email} já era membro desse subgrupo.`
      );
    } catch (err) {
      toast.erro(err instanceof ApiError ? err.message : "Não foi possível adicionar.");
    } finally {
      setEnviando(false);
    }
  }

  async function handleRemover(email: string) {
    try {
      await removerMembro(subgrupo.subgrupo_id, email);
      carregar();
      toast.sucesso(`${email} removido do subgrupo.`);
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
          {membros.map((m) => {
            const apelido = apelidoPorEmail.get(m.email);
            return (
              <li className="simple-row" key={m.email}>
                <div className="simple-row-main">
                  <div className="simple-row-title">{m.email}</div>
                  {apelido && <div className="simple-row-meta">{apelido}</div>}
                </div>
                <button className="icon-btn" title="Remover" onClick={() => handleRemover(m.email)}>
                  ✕
                </button>
              </li>
            );
          })}
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
