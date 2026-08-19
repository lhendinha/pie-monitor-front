import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { atualizarSubgrupo } from "../../services";
import { toastErroMutation } from "../../services/queryClient";
import { useToast } from "../../components";
import type { Subgrupo } from "../../types";

interface EditarSubgrupoFormProps {
  subgrupo: Subgrupo;
  onAtualizado: () => void;
  onFechar: () => void;
}

export default function EditarSubgrupoForm({ subgrupo, onAtualizado, onFechar }: EditarSubgrupoFormProps) {
  const [nome, setNome] = useState(subgrupo.nome || "");
  const [campoInvalido, setCampoInvalido] = useState(false);
  const toast = useToast();

  const atualizarMutation = useMutation({
    mutationFn: () => atualizarSubgrupo(subgrupo.subgrupo_id, nome.trim()),
    onSuccess: () => {
      onAtualizado();
      onFechar();
    },
    onError: (err) => {
      setCampoInvalido(true);
      toastErroMutation(toast, err, "Não foi possível atualizar.");
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
        <label htmlFor="nome-subgrupo-edicao">Nome</label>
        <input
          id="nome-subgrupo-edicao"
          value={nome}
          onChange={(e) => {
            setNome(e.target.value);
            setCampoInvalido(false);
          }}
          autoFocus
        />
      </div>
      <div className="modal-actions">
        <button className="btn" type="submit" disabled={atualizarMutation.isPending || !nome.trim()}>
          {atualizarMutation.isPending ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}
