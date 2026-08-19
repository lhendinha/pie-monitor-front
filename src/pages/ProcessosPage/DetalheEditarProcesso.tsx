import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { atualizarProcesso } from "../../services";
import { toastErroMutation } from "../../services/queryClient";
import { useToast } from "../../components";
import CamposProcesso from "./CamposProcesso";
import type { Processo } from "../../types";
import type { CamposOpcionaisProcesso } from "../../services/api/processos";

interface DetalheEditarProcessoProps {
  processo: Processo;
  onAtualizado: () => void;
  onFechar: () => void;
}

/** Modal único de detalhe/edição -- substitui o antigo "editar apelido"
 * (decisão 7 do plano): apelido vira só mais um campo aqui, junto com
 * Cliente/Objeto/Próxima providência/datas/Observações/Fase/Situação. */
export default function DetalheEditarProcesso({
  processo,
  onAtualizado,
  onFechar,
}: DetalheEditarProcessoProps) {
  const [apelido, setApelido] = useState(processo.apelido || "");
  const [campos, setCampos] = useState<CamposOpcionaisProcesso>({
    clienteIds: processo.cliente_ids || [],
    objetoAssunto: processo.objeto_assunto || "",
    proximaProvidencia: processo.proxima_providencia || "",
    dataVerificar: processo.data_verificar || "",
    prazoFinal: processo.prazo_final || "",
    observacoes: processo.observacoes || "",
    faseId: processo.fase_id || "",
    situacaoId: processo.situacao_id || "",
  });
  const [campoInvalido, setCampoInvalido] = useState(false);
  const toast = useToast();

  const atualizarMutation = useMutation({
    mutationFn: () =>
      atualizarProcesso(processo.subgrupo_id, processo.numero_processo, apelido.trim(), campos),
    onSuccess: () => {
      onAtualizado();
      onFechar();
    },
    onError: (err) => {
      setCampoInvalido(true);
      toastErroMutation(toast, err, "Não foi possível atualizar o processo.");
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

      <CamposProcesso valores={campos} onMudar={setCampos} />

      <div className="modal-actions">
        <button className="btn" type="submit" disabled={atualizarMutation.isPending}>
          {atualizarMutation.isPending ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}
