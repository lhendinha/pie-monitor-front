import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { criarProcesso } from "../../services";
import { toastErroMutation } from "../../services/queryClient";
import { apenasDigitos, mascararNumeroProcesso } from "../../utils";
import { useToast } from "../../components";
import type { Subgrupo } from "../../types";

interface NovoProcessoFormProps {
  subgrupos: Subgrupo[];
  onCadastrado: () => void;
  onFechar: () => void;
}

export default function NovoProcessoForm({
  subgrupos,
  onCadastrado,
  onFechar,
}: NovoProcessoFormProps) {
  const [subgrupoId, setSubgrupoId] = useState(subgrupos[0]?.subgrupo_id || "");
  const [numeroMascarado, setNumeroMascarado] = useState("");
  const [apelido, setApelido] = useState("");
  const [campoInvalido, setCampoInvalido] = useState(false);
  const toast = useToast();

  const numeroLimpo = apenasDigitos(numeroMascarado);

  const criarMutation = useMutation({
    mutationFn: () => criarProcesso(subgrupoId, numeroLimpo, apelido.trim()),
    onSuccess: () => {
      onCadastrado();
      onFechar();
    },
    onError: (err) => {
      setCampoInvalido(true);
      toastErroMutation(toast, err, "Não foi possível cadastrar.");
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setCampoInvalido(false);
    criarMutation.mutate();
  }

  if (subgrupos.length === 0) {
    return <div className="empty">Cria um subgrupo primeiro (aba Subgrupos) antes de cadastrar processos.</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="subgrupo">Subgrupo</label>
        <select id="subgrupo" value={subgrupoId} onChange={(e) => setSubgrupoId(e.target.value)}>
          {subgrupos.map((s) => (
            <option key={s.subgrupo_id} value={s.subgrupo_id}>
              {s.nome}
            </option>
          ))}
        </select>
      </div>
      <div className={`field${campoInvalido ? " field-error" : ""}`} style={{ marginTop: 14 }}>
        <label htmlFor="numero">Número do processo</label>
        <input
          id="numero"
          value={numeroMascarado}
          onChange={(e) => {
            setNumeroMascarado(mascararNumeroProcesso(e.target.value));
            setCampoInvalido(false);
          }}
          placeholder="0000266-87.2021.8.13.0559"
          inputMode="numeric"
          autoFocus
        />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="apelido">Apelido (opcional)</label>
        <input id="apelido" value={apelido} onChange={(e) => setApelido(e.target.value)} maxLength={512} />
      </div>
      <div className="modal-actions">
        <button
          className="btn"
          type="submit"
          disabled={criarMutation.isPending || numeroLimpo.length !== 20 || !subgrupoId}
        >
          {criarMutation.isPending ? "Cadastrando…" : "Cadastrar"}
        </button>
      </div>
    </form>
  );
}
