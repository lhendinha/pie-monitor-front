import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listarMembrosDoSubgrupo, adicionarMembro, removerMembro } from "../../services";
import { useToastOnQueryError, toastErroMutation } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import { useToast } from "../../components";
import type { Membro, Subgrupo } from "../../types";

interface SubgrupoMembrosProps {
  subgrupo: Subgrupo;
  apelidoPorEmail: Map<string, string | undefined>;
}

export default function SubgrupoMembros({ subgrupo, apelidoPorEmail }: SubgrupoMembrosProps) {
  const [novoEmail, setNovoEmail] = useState("");
  const toast = useToast();
  const queryClient = useQueryClient();
  const queryKey = qk.membrosDoSubgrupo(subgrupo.subgrupo_id);

  const query = useQuery<{ membros: Membro[] }>({
    queryKey,
    queryFn: () => listarMembrosDoSubgrupo(subgrupo.subgrupo_id),
  });
  useToastOnQueryError(query.error, "Não foi possível carregar os membros de " + subgrupo.nome);
  const membros = query.data?.membros ?? null;

  const adicionarMutation = useMutation({
    mutationFn: (email: string) => adicionarMembro(subgrupo.subgrupo_id, email) as Promise<{ mensagem: string; email: string }>,
    onSuccess: (resp) => {
      setNovoEmail("");
      queryClient.invalidateQueries({ queryKey });
      toast.sucesso(
        resp.mensagem === "adicionado"
          ? `${resp.email} adicionado ao subgrupo.`
          : `${resp.email} já era membro desse subgrupo.`
      );
    },
    onError: (err) => toastErroMutation(toast, err, "Não foi possível adicionar."),
  });

  const removerMutation = useMutation({
    mutationFn: (email: string) => removerMembro(subgrupo.subgrupo_id, email),
    onSuccess: (_dados, email) => {
      queryClient.invalidateQueries({ queryKey });
      toast.sucesso(`${email} removido do subgrupo.`);
    },
    onError: (err) => toastErroMutation(toast, err, "Não foi possível remover."),
  });

  function handleAdicionar(e: FormEvent) {
    e.preventDefault();
    adicionarMutation.mutate(novoEmail.trim().toLowerCase());
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
                <button
                  className="icon-btn"
                  title="Remover"
                  onClick={() => removerMutation.mutate(m.email)}
                >
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
        <button className="btn btn-ghost" type="submit" disabled={adicionarMutation.isPending || !novoEmail.trim()}>
          + Adicionar
        </button>
      </form>
    </div>
  );
}
