
import BotaoDeCancelar from "../BotaoDeCancelar";
import RodapeDeAcoes from "../RodapeDeAcoes";
import type { RodapeDeFormularioProps } from "./types";

/** O rodapé de um modal de formulário: "Cancelar" e o botão de enviar.
 *
 * 🔴 **Existe pelo que ele encapsula, e não pelo que economiza.** A regra é
 * sobre os DOIS botões juntos: enquanto a gravação está em voo, nenhum dos
 * dois responde. Hoje só o `ModalDaInscricao` fazia isso -- nos outros, clicar
 * "Cancelar" durante um envio fecha o modal e a mutation SEGUE: no
 * `ModalDeDocumento` o upload de 20 MB continua e o documento nasce mesmo
 * assim, sem ninguém na tela para ver.
 *
 * ⚠️ **O botão de enviar continua sendo do chamador**, de propósito. Os oito
 * variam de verdade: alvo do `form`, expressão de `disabled` com uma a quatro
 * cláusulas -- todas diferentes --, rótulo pendente que num deles depende do
 * tipo do documento, e o `ModalDeTarefa` ainda tem um terceiro botão. Um
 * componente genérico para ele precisaria de cinco props e não eliminaria
 * erro nenhum: seria repassar as mesmas coisas com outro nome.
 *
 * ⚠️ O `disabled` do botão de enviar continua com o chamador porque ele
 * também depende de validação (`faltaAlgo`, `podeEnviar`). O que este
 * componente garante é só a parte do `salvando`, que era a esquecida.
 */
export default function RodapeDeFormulario({
  salvando,
  acaoAEsquerda,
  children,
}: RodapeDeFormularioProps) {
  return (
    <RodapeDeAcoes>
      {acaoAEsquerda}
      <BotaoDeCancelar desabilitado={salvando} />
      {children}
    </RodapeDeAcoes>
  );
}
