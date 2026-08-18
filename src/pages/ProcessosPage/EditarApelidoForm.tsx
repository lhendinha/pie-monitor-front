import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { atualizarApelidoProcesso } from "../../services";
import { toastErroMutation } from "../../services/queryClient";
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
  const toast = useToast();

  const atualizarMutation = useMutation({
    mutationFn: () =>
      atualizarApelidoProcesso(processo.subgrupo_id, processo.numero_processo, apelido.trim()),
    onSuccess: () => {
      onAtualizado();
      onFechar();
    },
    onError: (err) => {
      setCampoInvalido(true);
      toastErroMutation(toast, err, "Não foi possível atualizar o apelido.");
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setCampoInvalido(false);
    atualizarMutation.mutate();
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
        <button className="btn" type="submit" disabled={atualizarMutation.isPending}>
          {atualizarMutation.isPending ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}
