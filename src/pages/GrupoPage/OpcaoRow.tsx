import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IconeArrastar } from "../../components";
import type { OpcaoProcesso } from "../../types";

interface OpcaoRowProps {
  opcao: OpcaoProcesso;
  onEditar: () => void;
  onDesativar: () => void;
  onReativar: () => void;
}

export default function OpcaoRow({ opcao, onEditar, onDesativar, onReativar }: OpcaoRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: opcao.opcao_id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li className="simple-row" ref={setNodeRef} style={style}>
      <button className="icon-btn drag-handle" title="Arrastar para reordenar" {...attributes} {...listeners}>
        <IconeArrastar />
      </button>
      <div className="simple-row-main">
        <div className="simple-row-title">
          {opcao.rotulo}
          {!opcao.ativo && <span className="muted"> (Inativa)</span>}
        </div>
      </div>
      <button className="icon-btn" title="Editar" onClick={onEditar}>
        ✎
      </button>
      {opcao.ativo ? (
        <button className="icon-btn" title="Desativar" onClick={onDesativar}>
          ✕
        </button>
      ) : (
        <button className="icon-btn" title="Reativar" onClick={onReativar}>
          ↺
        </button>
      )}
    </li>
  );
}
