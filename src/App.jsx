import { useEffect, useState, useCallback } from "react";
import {
  listarSubgrupos,
  criarSubgrupo,
  removerSubgrupo,
  listarMembrosDoGrupo,
  listarMembrosDoSubgrupo,
  adicionarMembro,
  removerMembro,
  listarProcessos,
  criarProcesso,
  removerProcesso,
  detalhesProcesso,
  criarConvite,
  listarHistorico,
  ApiError,
} from "./api.js";
import { apenasDigitos, mascararNumeroProcesso } from "./mask.js";
import {
  login,
  logout,
  limparTokens,
  estaAutenticado,
  getUsername,
  getPapel,
  papelAtende,
  ehSuperAdmin,
  aceitarConvite,
} from "./auth.js";

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

const NOME_PAPEL = { user: "Usuário", manager: "Gerente", admin: "Admin", super_admin: "Super Admin" };

/* ---------------------------------------------------------------------- */
/* Tela pública: aceitar convite (/convite/{token})                        */
/* ---------------------------------------------------------------------- */

function AceitarConviteScreen({ token }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await aceitarConvite(token, username.trim().toLowerCase(), password);
      setSucesso(true);
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (err) {
      setErro(err.message || "Não foi possível aceitar o convite.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="app">
      <header className="masthead">
        <p className="masthead-eyebrow">Convite</p>
        <h1 className="masthead-title">Criar sua conta</h1>
        <p className="masthead-sub">Escolha um usuário e senha pra entrar no grupo.</p>
      </header>

      {sucesso ? (
        <div className="banner banner-ok">Conta criada! Redirecionando…</div>
      ) : (
        <div className="gate">
          <form className="form-row" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="username">Usuário</label>
              <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="seu-usuario" />
            </div>
            <div className="field">
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="mínimo 8 caracteres"
              />
            </div>
            <button className="btn" type="submit" disabled={enviando || !username.trim() || password.length < 8}>
              {enviando ? "Criando…" : "Criar conta"}
            </button>
          </form>
          {erro && <div className="banner">{erro}</div>}
        </div>
      )}
    </div>
  );
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
      <p>O cadastro é feito manualmente (bootstrap) ou por convite de um admin do grupo.</p>
      <form className="form-row" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="username">Usuário</label>
          <input id="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

function DetalheProcesso({ numero, grupoAlvo, onFechar }) {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    detalhesProcesso(numero, grupoAlvo)
      .then(setDados)
      .catch((e) => setErro(e.message || "Não foi possível carregar."))
      .finally(() => setCarregando(false));
  }, [numero, grupoAlvo]);

  return (
    <div className="detail-panel">
      <div className="detail-panel-header">
        <div className="docket-numero">{mascararNumeroProcesso(numero)}</div>
        <button className="icon-btn" onClick={onFechar} title="Fechar">✕</button>
      </div>
      {carregando ? (
        <Skeleton linhas={2} />
      ) : erro ? (
        <div className="banner">{erro}</div>
      ) : (dados?.comunicacoes || []).length === 0 ? (
        <div className="empty">Nenhuma comunicação registrada ainda pra esse processo.</div>
      ) : (
        <ul className="simple-list">
          {dados.comunicacoes.map((c, i) => (
            <li className="simple-row simple-row-block" key={`${c.comunicacao_id}-${i}`}>
              <div className="simple-row-title">{c.tipo_comunicacao || "Comunicação"}</div>
              <div className="simple-row-meta">
                {c.data_disponibilizacao} · {c.nome_orgao}
              </div>
              {c.texto && <p className="detail-texto">{c.texto}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NovoProcessoForm({ subgrupos, grupoAlvo, onCadastrado }) {
  const [subgrupoId, setSubgrupoId] = useState("");
  const [numeroMascarado, setNumeroMascarado] = useState("");
  const [apelido, setApelido] = useState("");
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!subgrupoId && subgrupos.length > 0) setSubgrupoId(subgrupos[0].subgrupo_id);
  }, [subgrupos, subgrupoId]);

  const numeroLimpo = apenasDigitos(numeroMascarado);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await criarProcesso(subgrupoId, numeroLimpo, apelido.trim(), grupoAlvo);
      setNumeroMascarado("");
      setApelido("");
      onCadastrado();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Não foi possível cadastrar.");
    } finally {
      setEnviando(false);
    }
  }

  if (subgrupos.length === 0) {
    return <div className="empty">Cria um subgrupo primeiro (aba Subgrupos) antes de cadastrar processos.</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="field">
          <label htmlFor="subgrupo">Subgrupo</label>
          <select id="subgrupo" value={subgrupoId} onChange={(e) => setSubgrupoId(e.target.value)}>
            {subgrupos.map((s) => (
              <option key={s.subgrupo_id} value={s.subgrupo_id}>
                {s.nome}
              </option>
            ))}
          </select>
        </div>
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
          <input id="apelido" value={apelido} onChange={(e) => setApelido(e.target.value)} maxLength={512} />
        </div>
        <button className="btn" type="submit" disabled={enviando || numeroLimpo.length !== 20 || !subgrupoId}>
          {enviando ? "Cadastrando…" : "Cadastrar"}
        </button>
      </div>
      {erro && <div className="banner">{erro}</div>}
    </form>
  );
}

function AbaProcessos({ grupoAlvo, onAutenticacaoInvalida }) {
  const [processos, setProcessos] = useState([]);
  const [subgrupos, setSubgrupos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [numeroAberto, setNumeroAberto] = useState(null);

  const subgrupoNome = (id) => subgrupos.find((s) => s.subgrupo_id === id)?.nome || id;

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [dp, ds] = await Promise.all([listarProcessos(grupoAlvo), listarSubgrupos(grupoAlvo)]);
      setProcessos(dp.processos || []);
      setSubgrupos(ds.subgrupos || []);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onAutenticacaoInvalida();
      else setErro("Não foi possível carregar os processos.");
    } finally {
      setCarregando(false);
    }
  }, [grupoAlvo, onAutenticacaoInvalida]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function handleRemover(p) {
    if (!window.confirm(`Remover ${mascararNumeroProcesso(p.numero_processo)} desse subgrupo?`)) return;
    try {
      await removerProcesso(p.subgrupo_id, p.numero_processo, grupoAlvo);
      setProcessos((prev) => prev.filter((x) => !(x.subgrupo_id === p.subgrupo_id && x.numero_processo === p.numero_processo)));
    } catch {
      setErro("Não foi possível remover esse processo.");
    }
  }

  return (
    <>
      <NovoProcessoForm subgrupos={subgrupos} grupoAlvo={grupoAlvo} onCadastrado={carregar} />

      <div className="section-head">
        <h2>Processos monitorados</h2>
        <span className="section-count">{carregando ? "carregando…" : `${processos.length} ativo(s)`}</span>
      </div>

      {erro && <div className="banner">{erro}</div>}

      {carregando ? (
        <Skeleton />
      ) : processos.length === 0 ? (
        <div className="empty">Nenhum processo cadastrado ainda.</div>
      ) : (
        <ul className="docket-list">
          {processos.map((p) => (
            <li className="docket" key={`${p.subgrupo_id}-${p.numero_processo}`}>
              <button className="docket-main docket-main-clickable" onClick={() => setNumeroAberto(p.numero_processo)}>
                <div className="docket-numero">{mascararNumeroProcesso(p.numero_processo)}</div>
                <div className="docket-apelido">{p.apelido || p.numero_processo}</div>
                <div className="docket-meta">
                  {subgrupoNome(p.subgrupo_id)}
                  {p.ultima_verificacao ? ` · última verificação: ${p.ultima_verificacao}` : " · ainda não verificado"}
                </div>
              </button>
              <div className="docket-actions">
                <button className="icon-btn" title="Remover" onClick={() => handleRemover(p)}>
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {numeroAberto && (
        <DetalheProcesso numero={numeroAberto} grupoAlvo={grupoAlvo} onFechar={() => setNumeroAberto(null)} />
      )}
    </>
  );
}

/* ---------------------------------------------------------------------- */
/* Aba: Subgrupos                                                          */
/* ---------------------------------------------------------------------- */

function AbaSubgrupos({ grupoAlvo, onAutenticacaoInvalida }) {
  const [subgrupos, setSubgrupos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [nome, setNome] = useState("");
  const [enviando, setEnviando] = useState(false);

  const podeCriar = papelAtende("manager");
  const podeExcluir = papelAtende("admin");

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const d = await listarSubgrupos(grupoAlvo);
      setSubgrupos(d.subgrupos || []);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onAutenticacaoInvalida();
      else setErro("Não foi possível carregar os subgrupos.");
    } finally {
      setCarregando(false);
    }
  }, [grupoAlvo, onAutenticacaoInvalida]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function handleCriar(e) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await criarSubgrupo(nome.trim(), grupoAlvo);
      setNome("");
      await carregar();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Não foi possível criar.");
    } finally {
      setEnviando(false);
    }
  }

  async function handleRemover(id) {
    if (!window.confirm("Remover esse subgrupo? Só funciona se estiver vazio (0 membros).")) return;
    try {
      await removerSubgrupo(id, grupoAlvo);
      setSubgrupos((prev) => prev.filter((s) => s.subgrupo_id !== id));
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Não foi possível remover.");
    }
  }

  return (
    <>
      {podeCriar && (
        <form onSubmit={handleCriar}>
          <div className="form-row">
            <div className="field" style={{ flex: 2 }}>
              <label htmlFor="nome-subgrupo">Novo subgrupo</label>
              <input id="nome-subgrupo" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Cível, Trabalhista..." />
            </div>
            <button className="btn" type="submit" disabled={enviando || !nome.trim()}>
              {enviando ? "Criando…" : "Criar"}
            </button>
          </div>
        </form>
      )}

      <div className="section-head">
        <h2>Subgrupos</h2>
        <span className="section-count">{carregando ? "carregando…" : `${subgrupos.length}`}</span>
      </div>

      {erro && <div className="banner">{erro}</div>}

      {carregando ? (
        <Skeleton linhas={2} />
      ) : subgrupos.length === 0 ? (
        <div className="empty">Nenhum subgrupo ainda.</div>
      ) : (
        <ul className="simple-list">
          {subgrupos.map((s) => (
            <li className="simple-row" key={s.subgrupo_id}>
              <div className="simple-row-main">
                <div className="simple-row-title">{s.nome}</div>
              </div>
              {podeExcluir && (
                <button className="icon-btn" title="Remover" onClick={() => handleRemover(s.subgrupo_id)}>
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/* ---------------------------------------------------------------------- */
/* Aba: Membros                                                            */
/* ---------------------------------------------------------------------- */

function SubgrupoMembros({ subgrupo, grupoAlvo, onErro }) {
  const [membros, setMembros] = useState(null);
  const [novoUsername, setNovoUsername] = useState("");
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(() => {
    listarMembrosDoSubgrupo(subgrupo.subgrupo_id, grupoAlvo)
      .then((d) => setMembros(d.membros || []))
      .catch(() => onErro("Não foi possível carregar os membros de " + subgrupo.nome));
  }, [subgrupo, grupoAlvo, onErro]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function handleAdicionar(e) {
    e.preventDefault();
    setEnviando(true);
    try {
      await adicionarMembro(subgrupo.subgrupo_id, novoUsername.trim().toLowerCase(), grupoAlvo);
      setNovoUsername("");
      carregar();
    } catch (err) {
      onErro(err instanceof ApiError ? err.message : "Não foi possível adicionar.");
    } finally {
      setEnviando(false);
    }
  }

  async function handleRemover(username) {
    try {
      await removerMembro(subgrupo.subgrupo_id, username, grupoAlvo);
      carregar();
    } catch (err) {
      onErro(err instanceof ApiError ? err.message : "Não foi possível remover.");
    }
  }

  return (
    <div className="subgrupo-membros-card">
      <h3>{subgrupo.nome}</h3>
      {membros === null ? (
        <p className="muted">carregando…</p>
      ) : membros.length === 0 ? (
        <p className="muted">Nenhum membro ainda.</p>
      ) : (
        <ul className="simple-list">
          {membros.map((m) => (
            <li className="simple-row" key={m.username}>
              <div className="simple-row-main">
                <div className="simple-row-title">{m.username}</div>
              </div>
              <button className="icon-btn" title="Remover" onClick={() => handleRemover(m.username)}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <form className="form-row" onSubmit={handleAdicionar}>
        <div className="field">
          <input
            value={novoUsername}
            onChange={(e) => setNovoUsername(e.target.value)}
            placeholder="username pra adicionar"
          />
        </div>
        <button className="btn btn-ghost" type="submit" disabled={enviando || !novoUsername.trim()}>
          + Adicionar
        </button>
      </form>
    </div>
  );
}

function AbaMembros({ grupoAlvo, onAutenticacaoInvalida }) {
  const [pessoas, setPessoas] = useState([]);
  const [subgrupos, setSubgrupos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [dm, ds] = await Promise.all([listarMembrosDoGrupo(grupoAlvo), listarSubgrupos(grupoAlvo)]);
      setPessoas(dm.membros || []);
      setSubgrupos(ds.subgrupos || []);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onAutenticacaoInvalida();
      else setErro("Não foi possível carregar os membros.");
    } finally {
      setCarregando(false);
    }
  }, [grupoAlvo, onAutenticacaoInvalida]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return (
    <>
      <div className="section-head">
        <h2>Pessoas do grupo</h2>
        <span className="section-count">{carregando ? "carregando…" : `${pessoas.length}`}</span>
      </div>

      {erro && <div className="banner">{erro}</div>}

      {carregando ? (
        <Skeleton linhas={2} />
      ) : (
        <ul className="simple-list">
          {pessoas.map((p) => (
            <li className="simple-row" key={p.username}>
              <div className="simple-row-main">
                <div className="simple-row-title">{p.username}</div>
              </div>
              <span className={`role-badge role-${p.papel}`}>{NOME_PAPEL[p.papel] || p.papel}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="section-head">
        <h2>Membros por subgrupo</h2>
      </div>

      {!carregando &&
        subgrupos.map((s) => (
          <SubgrupoMembros key={s.subgrupo_id} subgrupo={s} grupoAlvo={grupoAlvo} onErro={setErro} />
        ))}
    </>
  );
}

/* ---------------------------------------------------------------------- */
/* Aba: Convidar                                                           */
/* ---------------------------------------------------------------------- */

function AbaConvidar({ grupoAlvo, onAutenticacaoInvalida }) {
  const [subgrupos, setSubgrupos] = useState([]);
  const [email, setEmail] = useState("");
  const [papelInicial, setPapelInicial] = useState("user");
  const [subgruposSelecionados, setSubgruposSelecionados] = useState([]);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    listarSubgrupos(grupoAlvo)
      .then((d) => setSubgrupos(d.subgrupos || []))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) onAutenticacaoInvalida();
      });
  }, [grupoAlvo, onAutenticacaoInvalida]);

  function alternarSubgrupo(id) {
    setSubgruposSelecionados((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  async function handleSubmit(e) {
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
            <select id="papel-convite" value={papelInicial} onChange={(e) => setPapelInicial(e.target.value)}>
              <option value="user">Usuário</option>
              <option value="manager">Gerente</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <div className="field" style={{ marginTop: 16 }}>
          <label>Subgrupos iniciais</label>
          <div className="checkbox-group">
            {subgrupos.map((s) => (
              <label className="checkbox-row" key={s.subgrupo_id}>
                <input
                  type="checkbox"
                  checked={subgruposSelecionados.includes(s.subgrupo_id)}
                  onChange={() => alternarSubgrupo(s.subgrupo_id)}
                />
                {s.nome}
              </label>
            ))}
          </div>
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

/* ---------------------------------------------------------------------- */
/* Aba: Histórico                                                          */
/* ---------------------------------------------------------------------- */

function AbaHistorico({ onAutenticacaoInvalida }) {
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    listarHistorico()
      .then((d) => setHistorico(d.historico || []))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) onAutenticacaoInvalida();
        else setErro("Não foi possível carregar o histórico.");
      })
      .finally(() => setCarregando(false));
  }, [onAutenticacaoInvalida]);

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
            <li className="simple-row simple-row-block" key={`${h.numero_processo}-${h.enviado_em}-${i}`}>
              <div className="simple-row-title">{mascararNumeroProcesso(h.numero_processo)}</div>
              <div className="simple-row-meta">
                {formatarDataHora(h.enviado_em)}
                {h.tipo_comunicacao ? ` · ${h.tipo_comunicacao}` : ""}
                {h.nome_orgao ? ` · ${h.nome_orgao}` : ""}
              </div>
              {h.destinatarios?.length > 0 && (
                <div className="simple-row-meta">Pra: {h.destinatarios.join(", ")}</div>
              )}
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

export default function App() {
  // Rota pública de aceite de convite -- detecção simples de caminho, sem lib de router
  if (window.location.pathname.startsWith("/convite/")) {
    const token = window.location.pathname.split("/convite/")[1]?.replace(/\/$/, "");
    return <AceitarConviteScreen token={token} />;
  }

  const [autenticado, setAutenticado] = useState(() => estaAutenticado());
  const [autenticacaoInvalida, setAutenticacaoInvalida] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState("processos");
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

  const ABAS = [
    { id: "processos", label: "Processos", minimo: "user" },
    { id: "subgrupos", label: "Subgrupos", minimo: "user" },
    { id: "membros", label: "Membros", minimo: "manager" },
    { id: "convidar", label: "Convidar", minimo: "admin" },
    { id: "historico", label: "Histórico", minimo: "user" },
  ].filter((a) => papelAtende(a.minimo));

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
          {autenticacaoInvalida && <div className="banner">Sua sessão expirou. Entra de novo.</div>}
          <LoginGate onEntrar={handleEntrar} />
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

          {abaAtiva === "processos" && <AbaProcessos grupoAlvo={grupoAlvo} onAutenticacaoInvalida={handleAutenticacaoInvalida} />}
          {abaAtiva === "subgrupos" && <AbaSubgrupos grupoAlvo={grupoAlvo} onAutenticacaoInvalida={handleAutenticacaoInvalida} />}
          {abaAtiva === "membros" && <AbaMembros grupoAlvo={grupoAlvo} onAutenticacaoInvalida={handleAutenticacaoInvalida} />}
          {abaAtiva === "convidar" && <AbaConvidar grupoAlvo={grupoAlvo} onAutenticacaoInvalida={handleAutenticacaoInvalida} />}
          {abaAtiva === "historico" && <AbaHistorico onAutenticacaoInvalida={handleAutenticacaoInvalida} />}

          <div className="footer-note">
            {getUsername()} · {NOME_PAPEL[getPapel()] || getPapel()} · <button onClick={handleSair}>Sair</button>
          </div>
        </>
      )}
    </div>
  );
}
