import { useEffect, useState, type FormEvent } from "react";
import { listarSubgrupos, criarConvite, ApiError } from "../../services";
import { MultiSelect, useToast } from "../../components";
import type { Papel, Subgrupo } from "../../types";

interface PageProps {
  onAutenticacaoInvalida: () => void;
}

export default function ConvidarPage({ onAutenticacaoInvalida }: PageProps) {
  const [subgrupos, setSubgrupos] = useState<Subgrupo[]>([]);
  const [email, setEmail] = useState("");
  const [papelInicial, setPapelInicial] = useState<Papel>("user");
  const [subgruposSelecionados, setSubgruposSelecionados] = useState<string[]>([]);
  const [campoInvalido, setCampoInvalido] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const toast = useToast();

  useEffect(() => {
    listarSubgrupos()
      .then((d: any) => setSubgrupos(d.subgrupos || []))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) onAutenticacaoInvalida();
      });
  }, [onAutenticacaoInvalida]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setCampoInvalido(false);
    setEnviando(true);
    try {
      await criarConvite(email.trim().toLowerCase(), papelInicial, subgruposSelecionados);
      toast.sucesso(`Convite enviado pra ${email}.`);
      setEmail("");
      setSubgruposSelecionados([]);
    } catch (err) {
      setCampoInvalido(true);
      toast.erro(err instanceof ApiError ? err.message : "Não foi possível convidar.");
    } finally {
      setEnviando(false);
    }
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
            disabled={enviando || !email.trim() || subgruposSelecionados.length === 0}
          >
            {enviando ? "Enviando…" : "Enviar convite"}
          </button>
        </div>
      </form>
    </>
  );
}
