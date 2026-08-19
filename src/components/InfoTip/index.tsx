import type { ReactNode } from "react";

interface InfoTipProps {
  children: ReactNode;
}

/** Ícone "i" com tooltip -- explicação sob demanda ao lado de um label,
 * em vez de texto sempre visível ocupando espaço na tela. */
export default function InfoTip({ children }: InfoTipProps) {
  return (
    <span className="info-tip" tabIndex={0}>
      <span className="info-tip-icone">i</span>
      <span className="info-tip-bolha">{children}</span>
    </span>
  );
}
