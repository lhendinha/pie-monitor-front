import { useState, type FormEvent } from "react";
import { atualizarApelidoProcesso, ApiError } from "../../services";
import { useToast } from "../../components";
import type { Processo } from "../../types";

interface EditarApelidoFormProps {
  processo: Processo;
  onAtualizado: () => void;
  onFechar: () => void;
}

export default function EditarApelidoForm({
  processo,
  onAtualizado,
  onFechar,
}: EditarApelidoFormProps) {
  const [apelido, setApelido] = useState(processo.apelido || "");
  const [campoInvalido, setCampoInvalido] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const toast = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setCampoInvalido(false);
    setEnviando(true);
    try {
      await atualizarApelidoProcesso(
        processo.subgrupo_id,
        processo.numero_processo,
        apelido.trim()
      );
      onAtualizado();
      onFechar();
    } catch (err) {
      setCampoInvalido(true);
      toast.erro(err instanceof ApiError ? err.message : "Não foi possível atualizar o apelido.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className={`field${campoInvalido ? " field-error" : ""}`}>
        <label htmlFor="apelido-edicao">Apelido</label>
        <input
          id="apelido-edicao"
          value={apelido}
          onChange={(e) => {
            setApelido(e.target.value);
            setCampoInvalido(false);
          }}
          maxLength={512}
          autoFocus
        />
      </div>
      <div className="modal-actions">
        <button className="btn" type="submit" disabled={enviando}>
          {enviando ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}
