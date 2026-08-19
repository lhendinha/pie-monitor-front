import { useEffect, useState } from "react";
import { estaAutenticado, papelAtende, getEmail, getApelido, getPapel, limparTokens, logout } from "./services";
import { setAutenticacaoInvalidaListener } from "./services/authBridge";
import { dataHojeExtenso, parseDeepLinkHistorico } from "./utils";
import type { DeepLinkHistorico } from "./utils";
import { NOME_PAPEL } from "./constants";
import { ToastProvider } from "./components";
import type { AbaConfig, AbaId, TelaAuth } from "./types";

import {
  LoginPage,
  AceitarConvitePage,
  EsqueciSenhaPage,
  RedefinirSenhaPage,
  ProcessosPage,
  ClientesPage,
  HistoricoPage,
  GrupoPage,
} from "./pages";

const TODAS_AS_ABAS: AbaConfig[] = [
  { id: "processos", label: "Processos", minimo: "user" },
  { id: "clientes", label: "Clientes", minimo: "user" },
  { id: "historico", label: "Histórico", minimo: "user" },
  // "Grupo" agrupa Subgrupos/Membros/Convidar/Fases/Situações como
  // sub-navegação (GrupoPage) -- piso "user" aqui em cima porque Subgrupos
  // sozinho já é "user"; cada sub-aba mantém o próprio piso mais alto.
  { id: "grupo", label: "Grupo", minimo: "user" },
];

export default function App() {
  const pathname = window.location.pathname;

  const [autenticado, setAutenticado] = useState(() => estaAutenticado());
  const [autenticacaoInvalida, setAutenticacaoInvalida] = useState(false);
  const [telaAuth, setTelaAuth] = useState<TelaAuth>("login");
  // Deep link do e-mail de notificação (?processo=&comunicacao=) -- lido
  // uma vez aqui, no mount, e limpo da URL imediatamente. Decide a aba
  // inicial e é repassado pra HistoricoPage abrir o modal certo sozinha.
  const [deepLinkHistorico, setDeepLinkHistorico] = useState<DeepLinkHistorico | null>(() => {
    const encontrado = parseDeepLinkHistorico(window.location.search);
    if (encontrado) window.history.replaceState({}, "", window.location.pathname);
    return encontrado;
  });
  const [abaAtiva, setAbaAtiva] = useState<AbaId>(() => (deepLinkHistorico ? "historico" : "processos"));

  function handleEntrar() {
    setAutenticado(true);
    setAutenticacaoInvalida(false);
  }

  async function handleSair() {
    await logout();
    setAutenticado(false);
    setTelaAuth("login");
  }

  function handleAutenticacaoInvalida() {
    limparTokens();
    setAutenticado(false);
    setAutenticacaoInvalida(true);
    setTelaAuth("login");
  }

  // Registra esse handler pro queryClient poder disparar a mesma transição
  // de tela quando qualquer query/mutation React Query levar um 401 (ver
  // services/authBridge.ts e services/queryClient.ts).
  useEffect(() => {
    setAutenticacaoInvalidaListener(handleAutenticacaoInvalida);
    return () => setAutenticacaoInvalidaListener(null);
  });

  // Rotas públicas por caminho -- detecção simples, sem lib de router. Cada
  // uma continua precisando do <ToastProvider> (useToast() é usado dentro
  // dessas páginas), por isso entra dentro do provider igual o app principal.
  if (pathname.startsWith("/convite/")) {
    const token = pathname.split("/convite/")[1]?.replace(/\/$/, "") || "";
    return (
      <ToastProvider>
        <AceitarConvitePage token={token} />
      </ToastProvider>
    );
  }
  if (pathname.startsWith("/redefinir-senha/")) {
    const token = pathname.split("/redefinir-senha/")[1]?.replace(/\/$/, "") || "";
    return (
      <ToastProvider>
        <RedefinirSenhaPage token={token} />
      </ToastProvider>
    );
  }

  const mostrarLogin = !autenticado || autenticacaoInvalida;
  const abas = TODAS_AS_ABAS.filter((a) => papelAtende(a.minimo));
  const papel = getPapel();

  return (
    <ToastProvider>
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
            {telaAuth === "login" ? (
              <LoginPage onEntrar={handleEntrar} onEsqueciSenha={() => setTelaAuth("esqueci-senha")} />
            ) : (
              <EsqueciSenhaPage onVoltar={() => setTelaAuth("login")} />
            )}
          </>
        ) : (
          <>
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

            {abaAtiva === "processos" && <ProcessosPage />}
            {abaAtiva === "clientes" && <ClientesPage />}
            {abaAtiva === "historico" && (
              <HistoricoPage
                deepLink={deepLinkHistorico}
                onDeepLinkConsumido={() => setDeepLinkHistorico(null)}
              />
            )}
            {abaAtiva === "grupo" && <GrupoPage />}

            <div className="footer-note">
              {getApelido() || getEmail()} · {(papel && NOME_PAPEL[papel]) || papel} ·{" "}
              <button onClick={handleSair}>Sair</button>
            </div>
          </>
        )}
      </div>
    </ToastProvider>
  );
}
