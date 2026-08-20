import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { criarCliente } from "../../services";
import { toastErroMutation } from "../../services/queryClient";
import { apenasDigitos, mascararCpfCnpj, mascararTelefone } from "../../utils";
import { useToast } from "../../components";

interface NovoClienteFormProps {
  onCadastrado: () => void;
  onFechar: () => void;
}

export default function NovoClienteForm({ onCadastrado, onFechar }: NovoClienteFormProps) {
  const [nome, setNome] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const toast = useToast();

  const criarMutation = useMutation({
    // Backend grava só dígitos (mesmo padrão de mascararNumeroProcesso já
    // usado em NovoProcessoForm) -- a máscara é só exibição, aplicada de
    // novo a partir do valor salvo quando o cliente for editado depois.
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
    onError: (err) => {
      toastErroMutation(toast, err, "Não foi possível cadastrar.");
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    criarMutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="nome-cliente">Nome</label>
        <input
          id="nome-cliente"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome do cliente"
          autoFocus
        />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="cpf-cnpj-cliente">CPF/CNPJ (opcional)</label>
        <input
          id="cpf-cnpj-cliente"
          value={cpfCnpj}
          onChange={(e) => setCpfCnpj(mascararCpfCnpj(e.target.value))}
          inputMode="numeric"
        />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="telefone-cliente">Telefone (opcional)</label>
        <input
          id="telefone-cliente"
          value={telefone}
          onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
          inputMode="numeric"
        />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="email-cliente">E-mail (opcional)</label>
        <input id="email-cliente" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="modal-actions">
        <button className="btn" type="submit" disabled={criarMutation.isPending || !nome.trim()}>
          {criarMutation.isPending ? "Cadastrando…" : "Cadastrar"}
        </button>
      </div>
    </form>
  );
}
