import { useEffect, useState, type FormEvent } from "react";
import { listarSubgrupos, criarConvite, ApiError } from "../../services";
import type { Papel, Subgrupo } from "../../types";

interface PageProps {
  grupoAlvo: string;
  onAutenticacaoInvalida: () => void;
}

export default function ConvidarPage({ grupoAlvo, onAutenticacaoInvalida }: PageProps) {
  const [subgrupos, setSubgrupos] = useState<Subgrupo[]>([]);
  const [email, setEmail] = useState("");
  const [papelInicial, setPapelInicial] = useState<Papel>("user");
  const [subgruposSelecionados, setSubgruposSelecionados] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    listarSubgrupos(grupoAlvo)
      .then((d: any) => setSubgrupos(d.subgrupos || []))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) onAutenticacaoInvalida();
      });
  }, [grupoAlvo, onAutenticacaoInvalida]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setSucesso(null);
    setEnviando(true);
    try {
      await criarConvite(email.trim().toLowerCase(), papelInicial, subgruposSelecionados, grupoAlvo);
      setSucesso(`Convite enviado pra ${email}.`);
      setEmail("");
      setSubgruposSelecionados([]);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Não foi possível convidar.");
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
          <div className="field" style={{ flex: 2 }}>
            <label htmlFor="email-convite">E-mail</label>
            <input id="email-convite" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
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
          <select
            id="subgrupos-convite"
            multiple
            className="multi-select"
            value={subgruposSelecionados}
            onChange={(e) =>
              setSubgruposSelecionados(Array.from(e.target.selectedOptions, (o) => o.value))
            }
          >
            {subgrupos.map((s) => (
              <option key={s.subgrupo_id} value={s.subgrupo_id}>
                {s.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row" style={{ marginTop: 16 }}>
          <button className="btn" type="submit" disabled={enviando || !email.trim() || subgruposSelecionados.length === 0}>
            {enviando ? "Enviando…" : "Enviar convite"}
          </button>
        </div>
      </form>

      {erro && <div className="banner">{erro}</div>}
      {sucesso && <div className="banner banner-ok">{sucesso}</div>}
    </>
  );
}
