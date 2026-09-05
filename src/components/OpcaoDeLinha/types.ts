import type { ReactNode } from "react";

export interface OpcaoDeLinhaProps {
  ativa: boolean;
  onClick: () => void;
  children: ReactNode;
}
