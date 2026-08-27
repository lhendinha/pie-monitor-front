import { Input } from "@chakra-ui/react";
import { useState } from "react";

import {
  Botao,
  Campo,
  CampoDeResponsaveis,
  Cartao,
  LinhaDeCampos,
  Select,
} from "../../../../components";
import { STATUS_DE_ATENDIMENTO } from "../../../../constants/atendimento";
import type { Atendimento } from "../../../../types";

interface FormularioAtendimentoProps {
  atendimento: Atendimento;
  salvando: boolean;
  onSalvar: (campos: { assunto: string; status: string; responsaveis: string[] }) => void;
}

/** A aba **Detalhes**: o que o atendimento É, editável.
 *
 * 🔴 **Existe porque o status virou campo de formulário.** Ele morava num
 * `Select` solto no cabeçalho, ao lado do botão de excluir -- um controle que
 * salvava sozinho, sem "Salvar", enquanto o assunto não tinha onde ser
 * editado. Campo se edita em formulário; a aba é o que tornou isso possível.
 *
 * ⚠️ O botão só habilita quando algo MUDOU. Sem isso, "Salvar" num formulário
 * intocado manda um PATCH que reenviaria a mesma lista de responsáveis -- e o
 * servidor compara antes de notificar, mas a requisição à toa continua sendo à
 * toa.
 */
export default function FormularioAtendimento({
  atendimento,
  salvando,
  onSalvar,
}: FormularioAtendimentoProps) {
  const [assunto, setAssunto] = useState(atendimento.assunto);
  const [status, setStatus] = useState(atendimento.status);
  const [responsaveis, setResponsaveis] = useState<string[]>(atendimento.responsaveis ?? []);

  const mesmos =
    assunto.trim() === atendimento.assunto &&
    status === atendimento.status &&
    responsaveis.join() === (atendimento.responsaveis ?? []).join();

  return (
    <Cartao titulo="Detalhes">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSalvar({ assunto: assunto.trim(), status, responsaveis });
        }}
      >
        <Campo rotulo="Assunto" para="assunto-atendimento">
          <Input
            id="assunto-atendimento"
            value={assunto}
            onChange={(e) => setAssunto(e.target.value)}
          />
        </Campo>

        <LinhaDeCampos>
          <Campo rotulo="Status" para="status-do-atendimento">
            <Select
              id="status-do-atendimento"
              opcoes={STATUS_DE_ATENDIMENTO.map((nome) => ({ value: nome, label: nome }))}
              valor={status}
              onMudar={(novo) => novo && setStatus(novo)}
            />
          </Campo>

          <Campo rotulo="Responsáveis" para="responsaveis-atendimento">
            <CampoDeResponsaveis
              id="responsaveis-atendimento"
              /* O subgrupo vem do próprio atendimento -- aqui não há seletor,
                 e o subgrupo faz parte da chave dele (não se edita). */
              subgrupoId={atendimento.subgrupo_id}
              valor={responsaveis}
              /* Sem isto, quem já responde mas SAIU do subgrupo apareceria
                 como e-mail cru: essa pessoa não está na lista de membros. */
              nomes={atendimento.responsaveis_nomes}
              onMudar={setResponsaveis}
            />
          </Campo>
        </LinhaDeCampos>

        <Botao type="submit" disabled={mesmos || salvando} loading={salvando}>
          Salvar
        </Botao>
      </form>
    </Cartao>
  );
}
