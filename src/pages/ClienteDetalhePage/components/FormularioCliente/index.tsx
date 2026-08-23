import { Flex, Heading, Input } from "@chakra-ui/react";
import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";

import { Botao, Campo, Cartao, IconeLixeira, useToast } from "../../../../components";
import { atualizarCliente } from "../../../../services";
import { toastErroMutation } from "../../../../services/queryClient";
import { apenasDigitos, emailValido, mascararCpfCnpj, mascararTelefone } from "../../../../utils";
import type { Cliente } from "../../../../types";

interface FormularioClienteProps {
  cliente: Cliente;
  podeExcluir: boolean;
  onSalvo: () => void;
  onRemover: () => void;
}

/** Cabeçalho + formulário de edição do cliente, como no artifact: o nome
 * como título, as ações à direita da mesma linha, e os campos num cartão.
 *
 * Excluir só aparece pra `admin` -- é a mesma régua do backend, que recusa
 * a exclusão abaixo disso. Mostrar um botão que a API vai negar é pior que
 * não mostrar.
 */
export default function FormularioCliente({ cliente, podeExcluir, onSalvo, onRemover }: FormularioClienteProps) {
  const [nome, setNome] = useState(cliente.nome);
  const [cpfCnpj, setCpfCnpj] = useState(mascararCpfCnpj(cliente.cpf_cnpj || ""));
  const [telefone, setTelefone] = useState(mascararTelefone(cliente.telefone || ""));
  const [email, setEmail] = useState(cliente.email || "");
  const toast = useToast();

  const emailInvalido = email.trim() !== "" && !emailValido(email);

  const salvarMutation = useMutation({
    mutationFn: () =>
      atualizarCliente(cliente.cliente_id, {
        nome: nome.trim(),
        cpfCnpj: apenasDigitos(cpfCnpj),
        telefone: apenasDigitos(telefone),
        email: email.trim(),
      }),
    onSuccess: onSalvo,
    onError: (err) => toastErroMutation(toast, err, "Não foi possível atualizar o cliente."),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    salvarMutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit}>
      <Flex align="flex-start" justify="space-between" gap="16px" mb="18px">
        <Heading as="h1" fontSize="23px" fontWeight="800" letterSpacing="-0.01em">
          {cliente.nome}
        </Heading>
        <Flex gap="8px" flexShrink={0}>
          {podeExcluir && (
            <Botao variante="perigoContorno" onClick={onRemover}>
              <IconeLixeira />
              Excluir
            </Botao>
          )}
          <Botao
            type="submit"
            disabled={salvarMutation.isPending || !nome.trim() || emailInvalido}
          >
            {salvarMutation.isPending ? "Salvando…" : "Salvar"}
          </Botao>
        </Flex>
      </Flex>

      <Cartao>
        <Campo rotulo="Nome" para="nome-cliente-edicao" obrigatorio>
          <Input
            id="nome-cliente-edicao"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={256}
          />
        </Campo>

        <Campo rotulo="CPF/CNPJ (opcional)" para="cpf-cnpj-cliente-edicao">
          <Input
            id="cpf-cnpj-cliente-edicao"
            value={cpfCnpj}
            onChange={(e) => setCpfCnpj(mascararCpfCnpj(e.target.value))}
            inputMode="numeric"
          />
        </Campo>

        <Campo rotulo="Telefone (opcional)" para="telefone-cliente-edicao">
          <Input
            id="telefone-cliente-edicao"
            value={telefone}
            onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
            inputMode="numeric"
          />
        </Campo>

        <Campo
          rotulo="E-mail (opcional)"
          para="email-cliente-edicao"
          erro={emailInvalido ? "E-mail inválido." : undefined}
        >
          <Input
            id="email-cliente-edicao"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Campo>
      </Cartao>
    </form>
  );
}
