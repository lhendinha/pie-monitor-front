import { Flex } from "@chakra-ui/react";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

import { DURACAO_DO_AVISO_MS } from "../../constants/toast";
import { BotaoNu } from "../BotaoNu";
import { IconeAlerta, IconeCheck } from "../Icons";

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

/** Um aviso (`.toast` do artifact): pílula escura com o ícone colorido à
 * esquerda.
 *
 * O fundo é o MESMO nos dois casos, de propósito -- quem distingue é o
 * ícone. Aviso vermelho inteiro no canto da tela compete com o conteúdo, e
 * uma falha ao salvar não é um alarme.
 */
function Aviso({ item, onFechar }: { item: ToastItem; onFechar: () => void }) {
  const ehErro = item.tipo === "erro";
  return (
    <BotaoNu
      type="button"
      /* Clicar dispensa: o tempo é calibrado pra ler uma frase, e quem já
         leu não devia ter que esperar. */
      onClick={onFechar}
      aria-label="Dispensar aviso"
      /* O que separa erro de sucesso é o ícone, que é decorativo (e
         portanto invisível pra quem inspeciona o DOM). Isto dá um nome ao
         estado -- pro teste e pra quem depura. */
      data-tipo={item.tipo}
      display="flex"
      alignItems="center"
      gap="9px"
      maxW="360px"
      p="11px 16px"
      borderRadius="sm"
      bg="fg"
      color="white"
      boxShadow="md"
      fontSize="13px"
      fontWeight="600"
      textAlign="left"
      cursor="pointer"
      css={{
        "& svg": { width: "15px", height: "15px", flex: "0 0 auto" },
        animation: "aviso-entrar .15s ease",
        "@media (prefers-reduced-motion: reduce)": { animation: "none" },
      }}
    >
      {/* A forma muda junto com a cor: um erro com o MESMO tique, só que
          vermelho, se lê como sucesso pra quem olha de canto de olho. */}
      <Flex color={ehErro ? "status.bad" : "status.good"}>
        {ehErro ? <IconeAlerta /> : <IconeCheck />}
      </Flex>
      {item.mensagem}
    </BotaoNu>
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
