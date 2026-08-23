import { Input } from "@chakra-ui/react";
import { useId, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";

import { Botao, Campo, Modal, RodapeDeAcoes, useToast } from "../../../../components";
import { criarCliente } from "../../../../services";
import { toastErroMutation } from "../../../../services/queryClient";
import { apenasDigitos, emailValido, mascararCpfCnpj, mascararTelefone } from "../../../../utils";

interface NovoClienteFormProps {
  onCadastrado: () => void;
  onFechar: () => void;
}


export default function NovoClienteForm({ onCadastrado, onFechar }: NovoClienteFormProps) {
  /** Liga o botão do rodapé ao `<form>` do corpo pelo atributo `form` --
   * eles são irmãos, não pai e filho, porque o rodapé fica fora da área que
   * rola. `useId` e não uma constante: dois modais abertos ao mesmo tempo
   * teriam o mesmo id literal, e o botão de um enviaria o formulário do
   * outro. */
  const idFormulario = useId();
  const [nome, setNome] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const toast = useToast();

  // Só reclama de e-mail PREENCHIDO e malformado: o campo é opcional, e
  // acusar erro em campo vazio é ruído. O servidor recusa do mesmo jeito
  // (`EmailInvalido`) -- isto é pra avisar antes de a pessoa enviar.
  const emailInvalido = email.trim() !== "" && !emailValido(email);

  const criarMutation = useMutation({
    // O backend grava só dígitos -- a máscara é exibição, e é reaplicada a
    // partir do valor salvo quando o cliente for aberto depois.
    mutationFn: () =>
      criarCliente({
        nome: nome.trim(),
        cpfCnpj: apenasDigitos(cpfCnpj),
        telefone: apenasDigitos(telefone),
        email: email.trim(),
      }),
    onSuccess: () => {
      onCadastrado();
      onFechar();
    },
    onError: (err) => toastErroMutation(toast, err, "Não foi possível cadastrar."),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    criarMutation.mutate();
  }

  return (
    <Modal
      titulo="Novo cliente"
      onFechar={onFechar}
      rodape={
        <RodapeDeAcoes>
          <Botao variante="ghost" onClick={onFechar}>
            Cancelar
          </Botao>
          <Botao
            type="submit"
            form={idFormulario}
            disabled={criarMutation.isPending || !nome.trim() || emailInvalido}
          >
            {criarMutation.isPending ? "Cadastrando…" : "Cadastrar"}
          </Botao>
        </RodapeDeAcoes>
      }
    >
      <form id={idFormulario} onSubmit={handleSubmit}>
        <Campo rotulo="Nome" para="nome-cliente" obrigatorio>
          <Input
            id="nome-cliente"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome do cliente"
            autoFocus
          />
        </Campo>

        <Campo rotulo="CPF/CNPJ (opcional)" para="cpf-cnpj-cliente">
          <Input
            id="cpf-cnpj-cliente"
            value={cpfCnpj}
            onChange={(e) => setCpfCnpj(mascararCpfCnpj(e.target.value))}
            inputMode="numeric"
          />
        </Campo>

        <Campo rotulo="Telefone (opcional)" para="telefone-cliente">
          <Input
            id="telefone-cliente"
            value={telefone}
            onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
            inputMode="numeric"
          />
        </Campo>

        <Campo
          rotulo="E-mail (opcional)"
          para="email-cliente"
          erro={emailInvalido ? "E-mail inválido." : undefined}
        >
          <Input
            id="email-cliente"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Campo>
      </form>
    </Modal>
  );
}
