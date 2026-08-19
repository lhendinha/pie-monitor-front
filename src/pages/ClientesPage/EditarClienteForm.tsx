import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { atualizarCliente } from "../../services";
import { toastErroMutation } from "../../services/queryClient";
import { apenasDigitos, mascararCpfCnpj, mascararTelefone } from "../../utils";
import { useToast } from "../../components";
import type { Cliente } from "../../types";

interface EditarClienteFormProps {
  cliente: Cliente;
  onAtualizado: () => void;
  onFechar: () => void;
}

export default function EditarClienteForm({ cliente, onAtualizado, onFechar }: EditarClienteFormProps) {
  const [nome, setNome] = useState(cliente.nome || "");
  const [cpfCnpj, setCpfCnpj] = useState(mascararCpfCnpj(cliente.cpf_cnpj));
  const [telefone, setTelefone] = useState(mascararTelefone(cliente.telefone));
  const [email, setEmail] = useState(cliente.email || "");
  const [campoInvalido, setCampoInvalido] = useState(false);
  const toast = useToast();

  const atualizarMutation = useMutation({
    // Backend grava só dígitos -- ver mesmo comentário em NovoClienteForm.
    mutationFn: () =>
      atualizarCliente(cliente.cliente_id, {
        nome: nome.trim(),
        cpfCnpj: apenasDigitos(cpfCnpj),
        telefone: apenasDigitos(telefone),
        email: email.trim(),
      }),
    onSuccess: () => {
      onAtualizado();
      onFechar();
    },
    onError: (err) => {
      setCampoInvalido(true);
      toastErroMutation(toast, err, "Não foi possível atualizar.");
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setCampoInvalido(false);
    atualizarMutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className={`field${campoInvalido ? " field-error" : ""}`}>
        <label htmlFor="nome-cliente-edicao">Nome</label>
        <input
          id="nome-cliente-edicao"
          value={nome}
          onChange={(e) => {
            setNome(e.target.value);
            setCampoInvalido(false);
          }}
          autoFocus
        />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="cpf-cnpj-cliente-edicao">CPF/CNPJ</label>
        <input
          id="cpf-cnpj-cliente-edicao"
          value={cpfCnpj}
          onChange={(e) => setCpfCnpj(mascararCpfCnpj(e.target.value))}
          inputMode="numeric"
        />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="telefone-cliente-edicao">Telefone</label>
        <input
          id="telefone-cliente-edicao"
          value={telefone}
          onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
          inputMode="numeric"
        />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="email-cliente-edicao">E-mail</label>
        <input
          id="email-cliente-edicao"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="modal-actions">
        <button className="btn" type="submit" disabled={atualizarMutation.isPending || !nome.trim()}>
          {atualizarMutation.isPending ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}
