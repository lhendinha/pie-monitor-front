import { Flex } from "@chakra-ui/react";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

import { DURACAO_DO_AVISO_MS } from "../../constants/toast";
import Aviso from "./Aviso";
import type { ToastItem } from "../../types";

interface ToastContextValue {
  erro: (mensagem: string) => void;
  sucesso: (mensagem: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const proximoId = useRef(0);

  const remover = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const adicionar = useCallback(
    (tipo: ToastItem["tipo"], mensagem: string) => {
      const id = proximoId.current++;
      setToasts((prev) => [...prev, { id, tipo, mensagem }]);
      setTimeout(() => remover(id), DURACAO_DO_AVISO_MS);
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
      {/* `.toast-wrap` do artifact: canto inferior direito, empilhando pra
          cima, acima de tudo menos dos menus portalados. */}
      <Flex
        role="status"
        aria-live="polite"
        position="fixed"
        bottom="22px"
        right="22px"
        zIndex="200"
        direction="column"
        gap="8px"
      >
        {toasts.map((t) => (
          <Aviso key={t.id} item={t} onFechar={() => remover(t.id)} />
        ))}
      </Flex>
    </ToastContext.Provider>
  );
}

/** `erro(mensagem)` / `sucesso(mensagem)`. Precisa estar dentro de
 * `<ToastProvider>` (montado uma vez em `App.tsx`). */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast precisa estar dentro de <ToastProvider>");
  }
  return ctx;
}
