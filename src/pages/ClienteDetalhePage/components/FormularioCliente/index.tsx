import { Flex, Heading, Input } from "@chakra-ui/react";
import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";

import { Botao, Campo, CamposDeEndereco, Cartao, IconeLixeira, useToast } from "../../../../components";
import { atualizarCliente } from "../../../../services";
import { toastErroMutation } from "../../../../services/queryClient";
import { apenasDigitos, emailValido, mascararCep, mascararCpfCnpj, mascararTelefone } from "../../../../utils";
import type { Cliente, EnderecoDoCliente } from "../../../../types";
import { TAMANHO_MAXIMO_DO_NOME_DE_CLIENTE } from "../../../../constants";

interface FormularioClienteProps {
  cliente: Cliente;
  podeEditar: boolean;
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
 *
 * 🔴 E EDITAR só pra `manager`+, pela mesma razão -- que este arquivo
 * enunciava no parágrafo acima e não aplicava a si mesmo. `PATCH /clientes`
 * é `manager`; os campos vinham habilitados e o "Salvar" clicável pra
 * qualquer um, e o 403 só aparecia depois de a pessoa digitar tudo.
 *
 * ⚠️ Campos em `readOnly`, não escondidos nem desabilitados: `GET /clientes`
 * é `user`, então quem não pode gravar ainda tem direito a VER o que está
 * cadastrado -- e a copiar dali o telefone ou o e-mail, que é metade do
 * motivo de abrir a ficha. O que some é o botão, que é o que promete uma
 * ação impossível.
 *
 * 🔴 `readOnly` e não `disabled` porque `disabled` apaga o texto: medido em
 * Chrome, o `opacity: 0.5` que o Chakra aplica deixa o valor em 3,26:1 de
 * contraste sobre o branco -- abaixo dos 4,5:1 de texto normal. Travar a
 * edição não pode custar a leitura, que é a única coisa que sobrou pra
 * quem está vendo.
 *
 * 🔴 E por isso `handleSubmit` também confere: campo `readOnly` continua
 * participando do formulário (o `disabled` não participava), então esconder
 * o botão não basta como guarda -- só como aviso.
 */
export default function FormularioCliente({ cliente, podeEditar, podeExcluir, onSalvo, onRemover }: FormularioClienteProps) {
  const [nome, setNome] = useState(cliente.nome);
  const [cpfCnpj, setCpfCnpj] = useState(mascararCpfCnpj(cliente.cpf_cnpj || ""));
  const [telefone, setTelefone] = useState(mascararTelefone(cliente.telefone || ""));
  const [email, setEmail] = useState(cliente.email || "");
  /* `?? ""` em cada um: a API manda `null` pro que não foi preenchido, e um
     `<input>` controlado com `null` vira não-controlado. */
  const [endereco, setEndereco] = useState<EnderecoDoCliente>({
    cep: mascararCep(cliente.cep ?? ""),
    logradouro: cliente.logradouro ?? "",
    numero: cliente.numero ?? "",
    complemento: cliente.complemento ?? "",
    bairro: cliente.bairro ?? "",
    cidade: cliente.cidade ?? "",
    uf: cliente.uf ?? "",
  });
  const toast = useToast();

  const emailInvalido = email.trim() !== "" && !emailValido(email);

  const salvarMutation = useMutation({
    mutationFn: () =>
      atualizarCliente(cliente.cliente_id, {
        nome: nome.trim(),
        cpfCnpj: apenasDigitos(cpfCnpj),
        telefone: apenasDigitos(telefone),
        email: email.trim(),
        endereco,
      }),
    onSuccess: onSalvo,
    onError: (err) => toastErroMutation(toast, err, "Não foi possível atualizar o cliente."),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!podeEditar) return;
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
          {podeEditar && (
            <Botao
              type="submit"
              disabled={salvarMutation.isPending || !nome.trim() || emailInvalido}
            >
              {salvarMutation.isPending ? "Salvando…" : "Salvar"}
            </Botao>
          )}
        </Flex>
      </Flex>

      <Cartao>
        <Campo rotulo="Nome" para="nome-cliente-edicao" obrigatorio>
          <Input
            id="nome-cliente-edicao"
            readOnly={!podeEditar}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={TAMANHO_MAXIMO_DO_NOME_DE_CLIENTE}
          />
        </Campo>

        <Campo rotulo="CPF/CNPJ" para="cpf-cnpj-cliente-edicao">
          <Input
            id="cpf-cnpj-cliente-edicao"
            readOnly={!podeEditar}
            value={cpfCnpj}
            onChange={(e) => setCpfCnpj(mascararCpfCnpj(e.target.value))}
            inputMode="numeric"
          />
        </Campo>

        <Campo rotulo="Telefone" para="telefone-cliente-edicao">
          <Input
            id="telefone-cliente-edicao"
            readOnly={!podeEditar}
            value={telefone}
            onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
            inputMode="numeric"
          />
        </Campo>

        <Campo
          rotulo="E-mail"
          para="email-cliente-edicao"
          erro={emailInvalido ? "E-mail inválido." : undefined}
        >
          <Input
            id="email-cliente-edicao"
            readOnly={!podeEditar}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Campo>

        <CamposDeEndereco
          valores={endereco}
          onMudar={setEndereco}
          sufixoDoId="-edicao"
          somenteLeitura={!podeEditar}
        />
      </Cartao>
    </form>
  );
}
