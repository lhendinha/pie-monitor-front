import { useState } from "react";
import { estaAutenticado, ehSuperAdmin, papelAtende, getUsername, getPapel, limparTokens, logout } from "./services";
import { dataHojeExtenso } from "./utils";
import { NOME_PAPEL } from "./constants";
import type { Papel } from "./types";

import {
  LoginPage,
  AceitarConvitePage,
  ProcessosPage,
  SubgruposPage,
  MembrosPage,
  ConvidarPage,
  HistoricoPage,
} from "./pages";

type AbaId = "processos" | "subgrupos" | "membros" | "convidar" | "historico";

interface AbaConfig {
  id: AbaId;
  label: string;
  minimo: Papel;
}

const TODAS_AS_ABAS: AbaConfig[] = [
  { id: "processos", label: "Processos", minimo: "user" },
  { id: "subgrupos", label: "Subgrupos", minimo: "user" },
  { id: "membros", label: "Membros", minimo: "manager" },
  { id: "convidar", label: "Convidar", minimo: "admin" },
  { id: "historico", label: "Histórico", minimo: "user" },
];

export default function App() {
  // Rota pública de aceite de convite -- detecção simples de caminho, sem lib de router
  if (window.location.pathname.startsWith("/convite/")) {
    const token = window.location.pathname.split("/convite/")[1]?.replace(/\/$/, "") || "";
    return <AceitarConvitePage token={token} />;
  }

  const [autenticado, setAutenticado] = useState(() => estaAutenticado());
  const [autenticacaoInvalida, setAutenticacaoInvalida] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("processos");
  const [grupoAlvo, setGrupoAlvo] = useState("");

  function handleEntrar() {
    setAutenticado(true);
    setAutenticacaoInvalida(false);
  }

  async function handleSair() {
    await logout();
    setAutenticado(false);
  }

  function handleAutenticacaoInvalida() {
    limparTokens();
    setAutenticado(false);
    setAutenticacaoInvalida(true);
  }

  const mostrarLogin = !autenticado || autenticacaoInvalida;
  const superAdmin = ehSuperAdmin();
  const abas = TODAS_AS_ABAS.filter((a) => papelAtende(a.minimo));
  const papel = getPapel();

  return (
    <div className="app">
      <header className="masthead">
        <p className="masthead-eyebrow">Monitor de Processos</p>
        <h1 className="masthead-title">Diário de Acompanhamento</h1>
        <p className="masthead-sub">Cadastro e verificação de movimentações processuais no PJe.</p>
        <p className="masthead-date">{dataHojeExtenso()}</p>
      </header>

      {mostrarLogin ? (
        <>
          {autenticacaoInvalida && <div className="banner">Sua sessão expirou. Entra de novo.</div>}
          <LoginPage onEntrar={handleEntrar} />
        </>
      ) : (
        <>
          {superAdmin && (
            <div className="super-admin-bar">
              <label htmlFor="grupo-alvo">Grupo alvo (super_admin)</label>
              <input
                id="grupo-alvo"
                value={grupoAlvo}
                onChange={(e) => setGrupoAlvo(e.target.value)}
                placeholder="grupo_id"
              />
            </div>
          )}

          <nav className="tabs">
            {abas.map((aba) => (
              <button
                key={aba.id}
                className={`tab ${abaAtiva === aba.id ? "active" : ""}`}
                onClick={() => setAbaAtiva(aba.id)}
              >
                {aba.label}
              </button>
            ))}
          </nav>

          {abaAtiva === "processos" && (
            <ProcessosPage grupoAlvo={grupoAlvo} onAutenticacaoInvalida={handleAutenticacaoInvalida} />
          )}
          {abaAtiva === "subgrupos" && (
            <SubgruposPage grupoAlvo={grupoAlvo} onAutenticacaoInvalida={handleAutenticacaoInvalida} />
          )}
          {abaAtiva === "membros" && (
            <MembrosPage grupoAlvo={grupoAlvo} onAutenticacaoInvalida={handleAutenticacaoInvalida} />
          )}
          {abaAtiva === "convidar" && (
            <ConvidarPage grupoAlvo={grupoAlvo} onAutenticacaoInvalida={handleAutenticacaoInvalida} />
          )}
          {abaAtiva === "historico" && <HistoricoPage onAutenticacaoInvalida={handleAutenticacaoInvalida} />}

          <div className="footer-note">
            {getUsername()} · {(papel && NOME_PAPEL[papel]) || papel} · <button onClick={handleSair}>Sair</button>
          </div>
        </>
      )}
    </div>
  );
}
