import { Input } from "@chakra-ui/react";
import { useId, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";

import { Botao, Campo, CamposDeEndereco, Modal, RodapeDeFormulario } from "../../../../components";
import { useToast } from "../../../../contexts/ToastContext";
import { criarCliente } from "../../../../services";
import { toastErroMutation } from "../../../../services/queryClient";
import { apenasDigitos, emailValido, mascararCpfCnpj, mascararTelefone } from "../../../../utils";
import { useGuardaDeDescarte } from "../../../../hooks/useGuardaDeDescarte";
import { ENDERECO_VAZIO, TAMANHO_MAXIMO_DO_NOME_DE_CLIENTE } from "../../../../constants";
import type { EnderecoDoCliente } from "../../../../types";

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
  const [endereco, setEndereco] = useState<EnderecoDoCliente>(ENDERECO_VAZIO);
  const toast = useToast();

  // Só reclama de e-mail PREENCHIDO e malformado: o campo é opcional, e
  // acusar erro em campo vazio é ruído. O servidor recusa do mesmo jeito
  // (`EmailInvalido`) -- isto é pra avisar antes de a pessoa enviar.
  const emailInvalido = email.trim() !== "" && !emailValido(email);

  /* 🔴 A projeção é o CORPO DO ENVIO, campo a campo -- e aqui isso não é
     elegância, é o que evita um defeito medido.
     `mascararTelefone` com dois dígitos vira `(12)`, e o backspace nunca
     devolve `""`: `apenasDigitos("(12")` é `"12"` e a máscara recoloca o
     parêntese. Projetando o texto formatado, quem digitasse e apagasse ficaria
     com o modal "alterado" para SEMPRE, sem conseguir mais sair sem pergunta.
     Projetando `apenasDigitos`, digitar e apagar volta a `""`.

     ⚠️ `endereco` é espalhado, e não passado inteiro: o tipo
     `ValorDeFormulario` recusa objeto aninhado de propósito, para ninguém
     comparar por referência sem perceber. Ele é plano (7 strings). */
  const { mudou } = useGuardaDeDescarte({
    nome: nome.trim(),
    cpfCnpj: apenasDigitos(cpfCnpj),
    telefone: apenasDigitos(telefone),
    email: email.trim(),
    ...endereco,
  });

  const criarMutation = useMutation({
    // O backend grava só dígitos -- a máscara é exibição, e é reaplicada a
    // partir do valor salvo quando o cliente for aberto depois.
    mutationFn: () =>
      criarCliente({
        nome: nome.trim(),
        cpfCnpj: apenasDigitos(cpfCnpj),
        telefone: apenasDigitos(telefone),
        email: email.trim(),
        endereco,
      }),
    onSuccess: () => {
      // Todas as outras criações do sistema confirmam; estas duas não
      // confirmavam nada, e quem cadastrasse estando na página 3 ou com
      // filtro via o modal fechar e a tela não mudar.
      toast.sucesso("Cliente cadastrado.");
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
      descarte={{ mudou, caso: "criacao" }}
      titulo="Novo cliente"
      onFechar={onFechar}
      rodape={
        <RodapeDeFormulario salvando={criarMutation.isPending}>
          <Botao
            type="submit"
            form={idFormulario}
            disabled={criarMutation.isPending || !nome.trim() || emailInvalido}
          >
            {criarMutation.isPending ? "Cadastrando…" : "Cadastrar"}
          </Botao>
        </RodapeDeFormulario>
      }
    >
      <form id={idFormulario} onSubmit={handleSubmit}>
        <Campo rotulo="Nome" para="nome-cliente" obrigatorio>
          <Input
            id="nome-cliente"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome do cliente"
            maxLength={TAMANHO_MAXIMO_DO_NOME_DE_CLIENTE}
            autoFocus
          />
        </Campo>

        <Campo rotulo="CPF/CNPJ" para="cpf-cnpj-cliente">
          <Input
            id="cpf-cnpj-cliente"
            value={cpfCnpj}
            onChange={(e) => setCpfCnpj(mascararCpfCnpj(e.target.value))}
            inputMode="numeric"
          />
        </Campo>

        <Campo rotulo="Telefone" para="telefone-cliente">
          <Input
            id="telefone-cliente"
            value={telefone}
            onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
            inputMode="numeric"
          />
        </Campo>

        <Campo
          rotulo="E-mail"
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

        <CamposDeEndereco valores={endereco} onMudar={setEndereco} />
      </form>
    </Modal>
  );
}
