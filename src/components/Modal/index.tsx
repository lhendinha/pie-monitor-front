import type { ReactNode } from "react";

interface ModalProps {
  titulo: string;
  onFechar: () => void;
  children: ReactNode;
}

export default function Modal({ titulo, onFechar, children }: ModalProps) {
  return (
    <div className="modal-overlay" onClick={onFechar}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{titulo}</h2>
          <button className="icon-btn" title="Fechar" onClick={onFechar}>
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
