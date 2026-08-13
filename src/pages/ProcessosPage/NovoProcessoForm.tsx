import { useState, type FormEvent } from "react";
import { criarProcesso, ApiError } from "../../services";
import { apenasDigitos, mascararNumeroProcesso } from "../../utils";
import type { Subgrupo } from "../../types";

interface NovoProcessoFormProps {
  subgrupos: Subgrupo[];
  grupoAlvo: string;
  onCadastrado: () => void;
  onFechar: () => void;
}

export default function NovoProcessoForm({
  subgrupos,
  grupoAlvo,
  onCadastrado,
  onFechar,
}: NovoProcessoFormProps) {
  const [subgrupoId, setSubgrupoId] = useState(subgrupos[0]?.subgrupo_id || "");
  const [numeroMascarado, setNumeroMascarado] = useState("");
  const [apelido, setApelido] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const numeroLimpo = apenasDigitos(numeroMascarado);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await criarProcesso(subgrupoId, numeroLimpo, apelido.trim(), grupoAlvo);
      onCadastrado();
      onFechar();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Não foi possível cadastrar.");
    } finally {
      setEnviando(false);
    }
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
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="numero">Número do processo</label>
        <input
          id="numero"
          value={numeroMascarado}
          onChange={(e) => setNumeroMascarado(mascararNumeroProcesso(e.target.value))}
          placeholder="0000266-87.2021.8.13.0559"
          inputMode="numeric"
          autoFocus
        />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="apelido">Apelido (opcional)</label>
        <input id="apelido" value={apelido} onChange={(e) => setApelido(e.target.value)} maxLength={512} />
      </div>
      {erro && <div className="banner">{erro}</div>}
      <div className="modal-actions">
        <button className="btn" type="submit" disabled={enviando || numeroLimpo.length !== 20 || !subgrupoId}>
          {enviando ? "Cadastrando…" : "Cadastrar"}
        </button>
      </div>
    </form>
  );
}
