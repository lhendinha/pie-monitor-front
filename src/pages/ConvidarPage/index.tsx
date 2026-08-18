import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { listarSubgrupos, criarConvite } from "../../services";
import { toastErroMutation, useToastOnQueryError } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import { MultiSelect, useToast } from "../../components";
import type { Papel, Subgrupo } from "../../types";

export default function ConvidarPage() {
  const [email, setEmail] = useState("");
  const [papelInicial, setPapelInicial] = useState<Papel>("user");
  const [subgruposSelecionados, setSubgruposSelecionados] = useState<string[]>([]);
  const [campoInvalido, setCampoInvalido] = useState(false);
  const toast = useToast();

  const subgruposQuery = useQuery<{ subgrupos: Subgrupo[] }>({
    queryKey: qk.subgrupos(),
    queryFn: listarSubgrupos,
  });
  useToastOnQueryError(subgruposQuery.error, "Não foi possível carregar os subgrupos.");
  const subgrupos = subgruposQuery.data?.subgrupos || [];

  const convidarMutation = useMutation({
    mutationFn: () => criarConvite(email.trim().toLowerCase(), papelInicial, subgruposSelecionados),
    onSuccess: () => {
      toast.sucesso(`Convite enviado pra ${email}.`);
      setEmail("");
      setSubgruposSelecionados([]);
    },
    onError: (err) => {
      setCampoInvalido(true);
      toastErroMutation(toast, err, "Não foi possível convidar.");
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setCampoInvalido(false);
    convidarMutation.mutate();
  }

  return (
    <>
      <div className="section-head">
        <h2>Convidar pra esse grupo</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className={`field${campoInvalido ? " field-error" : ""}`} style={{ flex: 2 }}>
            <label htmlFor="email-convite">E-mail</label>
            <input
              id="email-convite"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setCampoInvalido(false);
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="papel-convite">Papel inicial</label>
            <select
              id="papel-convite"
              value={papelInicial}
              onChange={(e) => setPapelInicial(e.target.value as Papel)}
            >
              <option value="user">Usuário</option>
              <option value="manager">Gerente</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <div className="field" style={{ marginTop: 16 }}>
          <label htmlFor="subgrupos-convite">Subgrupos</label>
          <MultiSelect
            id="subgrupos-convite"
            opcoes={subgrupos.map((s) => ({ value: s.subgrupo_id, label: s.nome }))}
            selecionados={subgruposSelecionados}
            onMudar={setSubgruposSelecionados}
            placeholder="Selecione os subgrupos"
          />
        </div>

        <div className="form-row" style={{ marginTop: 16 }}>
          <button
            className="btn"
            type="submit"
            disabled={convidarMutation.isPending || !email.trim() || subgruposSelecionados.length === 0}
          >
            {convidarMutation.isPending ? "Enviando…" : "Enviar convite"}
          </button>
        </div>
      </form>
    </>
  );
}
