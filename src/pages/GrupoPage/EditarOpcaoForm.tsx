import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { atualizarOpcaoProcesso } from "../../services";
import { toastErroMutation } from "../../services/queryClient";
import { useToast } from "../../components";
import type { OpcaoProcesso, TipoOpcaoProcesso } from "../../types";

interface EditarOpcaoFormProps {
  tipo: TipoOpcaoProcesso;
  opcao: OpcaoProcesso;
  onAtualizado: () => void;
  onFechar: () => void;
}

export default function EditarOpcaoForm({ tipo, opcao, onAtualizado, onFechar }: EditarOpcaoFormProps) {
  const [rotulo, setRotulo] = useState(opcao.rotulo || "");
  const [ordem, setOrdem] = useState(opcao.ordem);
  const [campoInvalido, setCampoInvalido] = useState(false);
  const toast = useToast();

  const atualizarMutation = useMutation({
    mutationFn: () => atualizarOpcaoProcesso(tipo, opcao.opcao_id, rotulo.trim(), ordem),
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
        <label htmlFor="rotulo-opcao-edicao">Rótulo</label>
        <input
          id="rotulo-opcao-edicao"
          value={rotulo}
          onChange={(e) => {
            setRotulo(e.target.value);
            setCampoInvalido(false);
          }}
          autoFocus
        />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="ordem-opcao-edicao">Ordem</label>
        <input
          id="ordem-opcao-edicao"
          type="number"
          value={ordem}
          onChange={(e) => setOrdem(Number(e.target.value))}
        />
      </div>
      <div className="modal-actions">
        <button className="btn" type="submit" disabled={atualizarMutation.isPending || !rotulo.trim()}>
          {atualizarMutation.isPending ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}
