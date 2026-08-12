import { useEffect, useState, useCallback } from "react";
import {
  listarProcessos,
  cadastrarProcesso,
  removerProcesso,
  listarEmails,
  cadastrarEmail,
  removerEmail,
  listarHistorico,
  ApiError,
} from "./api.js";
import { apenasDigitos, mascararNumeroProcesso } from "./mask.js";
import { login, logout, limparTokens, estaAutenticado, getUsername } from "./auth.js";

const dataHoje = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
}).format(new Date());

function formatarDataHora(iso) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/* ---------------------------------------------------------------------- */
/* Login                                                                    */
/* ---------------------------------------------------------------------- */

function LoginGate({ onEntrar }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await login(username.trim().toLowerCase(), password);
      onEntrar();
    } catch (err) {
      setErro(err.message || "Não foi possível entrar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="gate">
      <h2>Entrar</h2>
      <p>
        O cadastro de usuários é feito manualmente pelo administrador do sistema (via API, com a
        chave de acesso). Se você ainda não tem uma conta, peça pra ser cadastrado.
      </p>
      <form className="form-row" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="username">Usuário</label>
          <input
            id="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="seu usuário"
          />
        </div>
        <div className="field">
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="sua senha"
          />
        </div>
        <button className="btn" type="submit" disabled={enviando || !username.trim() || !password}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
      {erro && <div className="banner">{erro}</div>}
    </div>
  );
}

function Skeleton({ linhas = 3 }) {
  return (
    <div className="docket-list">
      {Array.from({ length: linhas }).map((_, i) => (
        <div className="docket-skeleton" key={i} />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Aba: Processos                                                          */
/* ---------------------------------------------------------------------- */

function NovoProcessoForm({ onCadastrado }) {
  const [numeroMascarado, setNumeroMascarado] = useState("");
  const [apelido, setApelido] = useState("");
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const numeroLimpo = apenasDigitos(numeroMascarado);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await cadastrarProcesso(numeroLimpo, apelido.trim());
      setNumeroMascarado("");
      setApelido("");
      onCadastrado();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Não foi possível cadastrar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="field">
          <label htmlFor="numero">Número do processo</label>
          <input
            id="numero"
            value={numeroMascarado}
            onChange={(e) => setNumeroMascarado(mascararNumeroProcesso(e.target.value))}
            placeholder="0000266-87.2021.8.13.0559"
            inputMode="numeric"
          />
        </div>
        <div className="field">
          <label htmlFor="apelido">Apelido (opcional)</label>
          <input
            id="apelido"
            value={apelido}
            onChange={(e) => setApelido(e.target.value)}
            placeholder="Caso FESMEPAR"
            maxLength={512}
          />
        </div>
        <button className="btn" type="submit" disabled={enviando || numeroLimpo.length !== 20}>
          {enviando ? "Cadastrando…" : "Cadastrar"}
        </button>
      </div>
      {erro && <div className="banner">{erro}</div>}
    </form>
  );
}

function AbaProcessos({ onAutenticacaoInvalida }) {
  const [processos, setProcessos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await listarProcessos();
      setProcessos((dados.processos || []).filter((p) => p.ativo !== false));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onAutenticacaoInvalida();
      else setErro("Não foi possível carregar os processos.");
    } finally {
      setCarregando(false);
    }
  }, [onAutenticacaoInvalida]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function handleRemover(numero) {
    if (!window.confirm(`Remover o processo ${mascararNumeroProcesso(numero)} do monitoramento?`)) return;
    try {
      await removerProcesso(numero);
      setProcessos((prev) => prev.filter((p) => p.numero_processo !== numero));
    } catch {
      setErro("Não foi possível remover esse processo. Tenta de novo.");
    }
  }

  return (
    <>
      <NovoProcessoForm onCadastrado={carregar} />

      <div className="section-head">
        <h2>Processos monitorados</h2>
        <span className="section-count">{carregando ? "carregando…" : `${processos.length} ativo(s)`}</span>
      </div>

      {erro && <div className="banner">{erro}</div>}

      {carregando ? (
        <Skeleton />
      ) : processos.length === 0 ? (
        <div className="empty">Nenhum processo cadastrado ainda. Adiciona um acima.</div>
      ) : (
        <ul className="docket-list">
          {processos.map((p) => (
            <li className="docket" key={p.numero_processo}>
              <div className="docket-main">
                <div className="docket-numero">{mascararNumeroProcesso(p.numero_processo)}</div>
                <div className="docket-apelido">{p.apelido || p.numero_processo}</div>
                <div className="docket-meta">
                  {p.ultima_verificacao ? `última verificação: ${p.ultima_verificacao}` : "ainda não verificado"}
                </div>
              </div>
              <div className="docket-actions">
                <button className="icon-btn" title="Remover" onClick={() => handleRemover(p.numero_processo)}>
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/* ---------------------------------------------------------------------- */
/* Aba: E-mails                                                            */
/* ---------------------------------------------------------------------- */

function AbaEmails({ onAutenticacaoInvalida }) {
  const [emails, setEmails] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [novoEmail, setNovoEmail] = useState("");
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await listarEmails();
      setEmails(dados.emails || []);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onAutenticacaoInvalida();
      else setErro("Não foi possível carregar os e-mails.");
    } finally {
      setCarregando(false);
    }
  }, [onAutenticacaoInvalida]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function handleAdicionar(e) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await cadastrarEmail(novoEmail.trim());
      setNovoEmail("");
      await carregar();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Não foi possível inscrever esse e-mail.");
    } finally {
      setEnviando(false);
    }
  }

  async function handleRemover(email) {
    if (!window.confirm(`Remover ${email} da lista de notificações?`)) return;
    try {
      await removerEmail(email);
      setEmails((prev) => prev.filter((e) => e.email !== email));
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Não foi possível remover esse e-mail.");
    }
  }

  return (
    <>
      <form onSubmit={handleAdicionar}>
        <div className="form-row">
          <div className="field" style={{ flex: 2 }}>
            <label htmlFor="novo-email">Novo e-mail</label>
            <input
              id="novo-email"
              type="email"
              value={novoEmail}
              onChange={(e) => setNovoEmail(e.target.value)}
              placeholder="voce@exemplo.com"
            />
          </div>
          <button className="btn" type="submit" disabled={enviando || !novoEmail.trim()}>
            {enviando ? "Inscrevendo…" : "Inscrever"}
          </button>
        </div>
      </form>

      <div className="section-head">
        <h2>E-mails notificados</h2>
        <span className="section-count">{carregando ? "carregando…" : `${emails.length} inscrito(s)`}</span>
      </div>

      {erro && <div className="banner">{erro}</div>}

      {carregando ? (
        <Skeleton linhas={2} />
      ) : emails.length === 0 ? (
        <div className="empty">Nenhum e-mail inscrito ainda.</div>
      ) : (
        <ul className="simple-list">
          {emails.map((e) => (
            <li className="simple-row" key={e.email}>
              <div className="simple-row-main">
                <div className="simple-row-title">{e.email}</div>
              </div>
              <span className={`badge ${e.status === "confirmado" ? "badge-ok" : "badge-pendente"}`}>
                {e.status}
              </span>
              <button className="icon-btn" title="Remover" onClick={() => handleRemover(e.email)}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/* ---------------------------------------------------------------------- */
/* Aba: Histórico                                                          */
/* ---------------------------------------------------------------------- */

function AbaHistorico({ onAutenticacaoInvalida }) {
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await listarHistorico();
      setHistorico(dados.historico || []);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onAutenticacaoInvalida();
      else setErro("Não foi possível carregar o histórico.");
    } finally {
      setCarregando(false);
    }
  }, [onAutenticacaoInvalida]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return (
    <>
      <div className="section-head">
        <h2>Histórico de e-mails enviados</h2>
        <span className="section-count">{carregando ? "carregando…" : `${historico.length} envio(s)`}</span>
      </div>

      {erro && <div className="banner">{erro}</div>}

      {carregando ? (
        <Skeleton linhas={4} />
      ) : historico.length === 0 ? (
        <div className="empty">Nenhuma notificação enviada ainda.</div>
      ) : (
        <ul className="simple-list">
          {historico.map((h, i) => (
            <li className="simple-row" key={`${h.numero_processo}-${h.enviado_em}-${i}`}>
              <div className="simple-row-main">
                <div className="simple-row-title">{h.apelido || h.numero_processo}</div>
                <div className="simple-row-meta">
                  {formatarDataHora(h.enviado_em)}
                  {h.tipo_comunicacao ? ` · ${h.tipo_comunicacao}` : ""}
                  {h.nome_orgao ? ` · ${h.nome_orgao}` : ""}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/* ---------------------------------------------------------------------- */
/* App                                                                      */
/* ---------------------------------------------------------------------- */

const ABAS = [
  { id: "processos", label: "Processos" },
  { id: "emails", label: "E-mails" },
  { id: "historico", label: "Histórico" },
];

export default function App() {
  const [autenticado, setAutenticado] = useState(() => estaAutenticado());
  const [autenticacaoInvalida, setAutenticacaoInvalida] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState("processos");

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

  return (
    <div className="app">
      <header className="masthead">
        <p className="masthead-eyebrow">Monitor de Processos</p>
        <h1 className="masthead-title">Diário de Acompanhamento</h1>
        <p className="masthead-sub">Cadastro e verificação de movimentações processuais no PJe.</p>
        <p className="masthead-date">{dataHoje}</p>
      </header>

      {mostrarLogin ? (
        <>
          {autenticacaoInvalida && (
            <div className="banner">Sua sessão expirou. Entra de novo.</div>
          )}
          <LoginGate onEntrar={handleEntrar} />
        </>
      ) : (
        <>
          <nav className="tabs">
            {ABAS.map((aba) => (
              <button
                key={aba.id}
                className={`tab ${abaAtiva === aba.id ? "active" : ""}`}
                onClick={() => setAbaAtiva(aba.id)}
              >
                {aba.label}
              </button>
            ))}
          </nav>

          {abaAtiva === "processos" && <AbaProcessos onAutenticacaoInvalida={handleAutenticacaoInvalida} />}
          {abaAtiva === "emails" && <AbaEmails onAutenticacaoInvalida={handleAutenticacaoInvalida} />}
          {abaAtiva === "historico" && <AbaHistorico onAutenticacaoInvalida={handleAutenticacaoInvalida} />}

          <div className="footer-note">
            Verificação automática 3x/dia (8h, 14h, 20h). Logado como {getUsername()} ·{" "}
            <button onClick={handleSair}>Sair</button>
          </div>
        </>
      )}
    </div>
  );
}
