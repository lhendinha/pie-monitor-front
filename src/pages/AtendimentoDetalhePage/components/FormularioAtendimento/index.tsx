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
import type { FormularioAtendimentoProps } from "./types";

/** A aba **Detalhes**: o que o atendimento É, editável.
 *
 * O status é campo de formulário, e não um `Select` solto no cabeçalho que
 * salva sozinho: campo se edita em formulário, e a aba é o que torna isso
 * possível.
 *
 * ⚠️ O botão só habilita quando algo MUDOU. Sem isso, "Salvar" num formulário
 * intocado manda um PATCH que reenviaria a mesma lista de responsáveis -- e o
 * servidor compara antes de notificar, mas a requisição à toa continua sendo à
 * toa.
 *
 * 🔴 **E só quando o assunto tem texto.** Apagar o assunto não conta como
 * mudança: se contasse, o Salvar acenderia e a recusa viria do servidor, que
 * exige o assunto tanto ao criar quanto ao editar. É a mesma barreira de
 * `NovoAtendimentoForm`, e as duas telas dizem a mesma coisa.
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

  const semAssunto = assunto.trim() === "";

  return (
    <Cartao titulo="Detalhes">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          /* Barra aqui também, e não só no `disabled`: é o que
             `NovoAtendimentoForm` faz, e vale para o envio por Enter. */
          if (mesmos || semAssunto) return;
          onSalvar({ assunto: assunto.trim(), status, responsaveis });
        }}
      >
        <Campo rotulo="Assunto" para="assunto-atendimento" obrigatorio>
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

        <Botao type="submit" disabled={mesmos || semAssunto || salvando} loading={salvando}>
          Salvar
        </Botao>
      </form>
    </Cartao>
  );
}
