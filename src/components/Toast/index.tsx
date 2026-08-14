import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

interface ToastItem {
  id: number;
  tipo: "erro" | "sucesso";
  mensagem: string;
}

interface ToastContextValue {
  erro: (mensagem: string) => void;
  sucesso: (mensagem: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DURACAO_MS = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const proximoId = useRef(0);

  const remover = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const adicionar = useCallback(
    (tipo: ToastItem["tipo"], mensagem: string) => {
      const id = proximoId.current++;
      setToasts((prev) => [...prev, { id, tipo, mensagem }]);
      setTimeout(() => remover(id), DURACAO_MS);
    },
    [remover]
  );

  const valor: ToastContextValue = {
    erro: (mensagem) => adicionar("erro", mensagem),
    sucesso: (mensagem) => adicionar("sucesso", mensagem),
  };

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <button key={t.id} type="button" className={`toast toast-${t.tipo}`} onClick={() => remover(t.id)}>
            {t.mensagem}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** `erro(mensagem)` / `sucesso(mensagem)` -- substitui o padrão antigo de
 * `<div className="banner">`. Precisa estar dentro de `<ToastProvider>`
 * (montado uma vez em `App.tsx`). */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast precisa estar dentro de <ToastProvider>");
  }
  return ctx;
}
