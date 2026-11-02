import { useEffect, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { api } from "./servicos/api";
import type { Imovel } from "./types";
import "./App.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

function isValidSupabaseUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

const supabase: SupabaseClient | null =
  isValidSupabaseUrl(supabaseUrl) && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

type Feedback = {
  type: "error" | "success" | "warning";
  message: string;
};

function App() {
  const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
  if (currentPath === "/vitrine") {
    return <VitrinePublica />;
  }

  return <Portal />;
}

function Portal() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let active = true;
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
        setAuthReady(true);
      },
    );

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setAuthError("Não foi possível verificar sua sessão. Entre novamente.");
      setSession(data.session);
      setAuthReady(true);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (!authReady) {
    return (
      <main className="loading-screen" aria-label="Carregando">
        <span className="loading-mark">M</span>
        <span>Preparando seu espaço...</span>
      </main>
    );
  }

  if (!session) {
    return <Login supabase={supabase} initialError={authError} />;
  }

  return <Dashboard session={session} />;
}

function Login({
  supabase,
  initialError,
}: {
  supabase: SupabaseClient | null;
  initialError: string;
}) {
  const [mode, setMode] = useState<"login" | "recover">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(
    initialError ? { type: "error", message: initialError } : null,
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (!supabase) {
      setFeedback({
        type: "error",
        message:
          "O login ainda não está configurado. Adicione a URL e a chave pública do Supabase ao arquivo front/.env.local.",
      });
      return;
    }

    setBusy(true);
    if (mode === "recover") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      setBusy(false);
      setFeedback(
        error
          ? { type: "error", message: error.message }
          : {
              type: "success",
              message: "Se esse e-mail estiver cadastrado, enviaremos as instruções de recuperação.",
            },
      );
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setFeedback({
        type: "error",
        message: "E-mail ou senha inválidos. Confira seus dados e tente novamente.",
      });
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-art" aria-label="Morar Bem">
        <a className="brand brand-light" href="/" aria-label="Morar Bem, início">
          <span className="brand-mark">M</span>
          <span className="brand-copy">
            <strong>morar<span>bem</span></strong>
            <small>GESTÃO IMOBILIÁRIA</small>
          </span>
        </a>
        <div className="art-copy">
          <span className="eyebrow">BEM-VINDO À MORAR BEM</span>
          <h1>Um jeito mais simples de cuidar de cada negócio.</h1>
          <p>Seu espaço para organizar clientes e acompanhar novas oportunidades.</p>
        </div>
        <div className="art-building" aria-hidden="true">
          <div className="building-sun" />
          <div className="building-tower tower-back">
            <i /><i /><i /><i /><i /><i />
          </div>
          <div className="building-tower tower-front">
            <i /><i /><i /><i /><i /><i /><i /><i />
          </div>
          <div className="building-plant plant-one" />
          <div className="building-plant plant-two" />
          <div className="building-ground" />
        </div>
        <span className="art-caption">CADA NOVO LAR COMEÇA COM UMA BOA CONVERSA.</span>
      </section>

      <section className="auth-panel">
        <div className="auth-form-wrap">
          <a className="brand brand-mobile" href="/" aria-label="Morar Bem, início">
            <span className="brand-mark">M</span>
            <span className="brand-copy">
              <strong>morar<span>bem</span></strong>
              <small>GESTÃO IMOBILIÁRIA</small>
            </span>
          </a>
          <div className="auth-heading">
            <span className="eyebrow">{mode === "login" ? "ÁREA DO CORRETOR" : "RECUPERAÇÃO DE ACESSO"}</span>
            <h2>{mode === "login" ? "Que bom ter você de volta." : "Vamos recuperar seu acesso."}</h2>
            <p>
              {mode === "login"
                ? "Entre com seus dados para acessar o painel."
                : "Informe seu e-mail e enviaremos as instruções para redefinir sua senha."}
            </p>
          </div>

          <form className="auth-form" onSubmit={submit}>
            <label className="field">
              <span>E-mail <b>*</b></span>
              <span className="input-wrap">
                <span className="input-icon" aria-hidden="true">✉</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </span>
            </label>

            {mode === "login" && (
              <label className="field">
                <span>Senha <b>*</b></span>
                <span className="input-wrap">
                  <span className="input-icon input-lock" aria-hidden="true">▣</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                  <button
                    className="password-toggle"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? "Ocultar" : "Mostrar"}
                  </button>
                </span>
              </label>
            )}

            {feedback && (
              <div className={`feedback feedback-${feedback.type}`} role="status">
                {feedback.message}
              </div>
            )}

            <button className="button button-primary auth-submit" type="submit" disabled={busy}>
              {busy ? "Aguarde..." : mode === "login" ? "Entrar" : "Enviar instruções"}
              {!busy && <span aria-hidden="true">→</span>}
            </button>
          </form>

          {mode === "login" ? (
            <button
              className="text-button forgot-link"
              type="button"
              onClick={() => {
                setFeedback(null);
                setMode("recover");
              }}
            >
              Esqueci minha senha
            </button>
          ) : (
            <button
              className="text-button back-login"
              type="button"
              onClick={() => {
                setFeedback(null);
                setMode("login");
              }}
            >
              <span aria-hidden="true">←</span> Voltar para entrar
            </button>
          )}

          {!supabase && (
            <p className="setup-hint">
              Para ativar o acesso, configure <code>VITE_SUPABASE_URL</code> e{" "}
              <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> no frontend.
            </p>
          )}
          <a className="public-link" href="/vitrine">Acessar vitrine pública <span aria-hidden="true">↗</span></a>
          <p className="auth-legal">© 2026 Morar Bem Imobiliária. Feito para aproximar pessoas e lares.</p>
        </div>
      </section>
    </main>
  );
}

function Dashboard({ session }: { session: Session }) {
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      setFeedback({ type: "error", message: "Não foi possível sair agora. Tente novamente." });
    }
  }

  function submitClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback({
      type: "warning",
      message:
        "Formulário validado, mas este cadastro está em modo de demonstração e ainda não foi salvo no banco.",
    });
  }

  const userEmail = session.user.email ?? "Usuário";
  const initials = userEmail.slice(0, 1).toUpperCase();

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <a className="brand sidebar-brand" href="/" aria-label="Morar Bem">
          <span className="brand-mark">M</span>
          <span className="brand-copy">
            <strong>morar<span>bem</span></strong>
            <small>GESTÃO IMOBILIÁRIA</small>
          </span>
        </a>
        <div className="sidebar-label">MENU PRINCIPAL</div>
        <a className="nav-item" href="/vitrine">
          <span className="nav-icon" aria-hidden="true">⌂</span> Vitrine de imóveis
        </a>
        <div className="nav-section">
          <div className="nav-item nav-item-active">
            <span className="nav-icon" aria-hidden="true">▦</span> Cadastros
            <span className="nav-chevron" aria-hidden="true">⌄</span>
          </div>
          <a className="nav-subitem nav-subitem-active" href="#novo-cliente">
            <span className="nav-subdot" /> Novo Cliente
          </a>
        </div>
        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-icon" aria-hidden="true">?</span>
            <strong>Precisa de ajuda?</strong>
            <span>Fale com nossa equipe.</span>
            <a href="mailto:suporte@morarbem.com.br">Entrar em contato <span aria-hidden="true">→</span></a>
          </div>
          <div className="sidebar-user">
            <span className="user-avatar">{initials}</span>
            <span className="user-info"><strong>{userEmail}</strong><small>Conta conectada</small></span>
            <button className="icon-button logout-button" type="button" onClick={signOut} aria-label="Sair">↪</button>
          </div>
        </div>
      </aside>

      <main className="dashboard-main" id="novo-cliente">
        <header className="topbar">
          <div className="breadcrumbs"><span>Cadastros</span><span aria-hidden="true">/</span><strong>Novo Cliente</strong></div>
          <div className="topbar-right">
            <span className="status-dot" /> Ambiente seguro
            <span className="topbar-avatar">{initials}</span>
          </div>
        </header>

        <div className="page-content">
          <div className="page-title-row">
            <div>
              <span className="eyebrow">CADASTROS</span>
              <h1>Novo Cliente</h1>
              <p>Preencha os dados abaixo para iniciar um novo relacionamento.</p>
            </div>
            <span className="step-pill"><span>1</span> Dados do cliente</span>
          </div>

          <form className="client-card" onSubmit={submitClient}>
            <div className="card-heading">
              <span className="card-icon" aria-hidden="true">♙</span>
              <div><h2>Informações pessoais</h2><p>Os campos com asterisco (*) são obrigatórios.</p></div>
            </div>

            <div className="form-grid">
              <label className="field field-full">
                <span>Nome completo <b>*</b></span>
                <input
                  type="text"
                  name="name"
                  autoComplete="name"
                  placeholder="Ex.: Maria da Silva"
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>E-mail <b>*</b></span>
                <input
                  type="email"
                  name="client-email"
                  autoComplete="email"
                  placeholder="Ex.: maria@email.com"
                  value={clientEmail}
                  onChange={(event) => setClientEmail(event.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>Telefone <b>*</b></span>
                <input
                  type="tel"
                  name="telephone"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="(11) 99999-9999"
                  value={clientPhone}
                  onChange={(event) => setClientPhone(event.target.value)}
                  required
                />
              </label>
            </div>

            <div className="demo-notice">
              <span aria-hidden="true">ⓘ</span>
              <p><strong>Modo de demonstração.</strong> Este formulário valida os campos, mas ainda não salva clientes no banco de dados.</p>
            </div>

            {feedback && <div className={`feedback feedback-${feedback.type}`} role="status">{feedback.message}</div>}

            <div className="form-footer">
              <span><b>*</b> Campos obrigatórios</span>
              <div className="form-actions">
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => {
                    setClientName("");
                    setClientEmail("");
                    setClientPhone("");
                    setFeedback(null);
                  }}
                >
                  Limpar
                </button>
                <button className="button button-save" type="submit">
                  <span aria-hidden="true">✓</span> Salvar
                </button>
              </div>
            </div>
          </form>
          <p className="page-footnote">Morar Bem <span>·</span> Gestão imobiliária feita com cuidado.</p>
        </div>
      </main>
    </div>
  );
}

function VitrinePublica() {
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [telefone, setTelefone] = useState("");
  const [imovelSelecionado, setImovelSelecionado] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void api
      .get<{ data: Imovel[] }>("/api/lista")
      .then(({ data }) => {
        if (active) setImoveis(data.data);
      })
      .catch(() => {
        if (active) {
          setFeedback({ type: "error", message: "Não foi possível carregar os imóveis. Tente novamente." });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!imovelSelecionado) return;
    setFeedback(null);
    try {
      const { data } = await api.post<{ message: string }>("/api/lead", {
        codigo_imovel: imovelSelecionado,
        telefone,
      });
      setFeedback({ type: "success", message: data.message });
      setTelefone("");
      setImovelSelecionado(null);
    } catch (error) {
      const message = isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : undefined;
      setFeedback({ type: "error", message: message ?? "Erro ao registrar interesse." });
    }
  }

  return (
    <main className="showcase-page">
      <header className="showcase-header">
        <a className="brand" href="/"><span className="brand-mark">M</span><span className="brand-copy"><strong>morar<span>bem</span></strong><small>IMOBILIÁRIA</small></span></a>
        <a className="button button-primary showcase-login" href="/">Acesso do corretor <span aria-hidden="true">→</span></a>
      </header>
      <section className="showcase-hero">
        <span className="eyebrow">ENCONTRE SEU PRÓXIMO CAPÍTULO</span>
        <h1>Um lugar para chamar de seu.</h1>
        <p>Conheça imóveis selecionados para combinar com a vida que você quer viver.</p>
      </section>
      {feedback && <div className="showcase-feedback"><div className={`feedback feedback-${feedback.type}`} role="status">{feedback.message}</div></div>}
      <section className="property-grid" aria-label="Imóveis disponíveis">
        {loading && <p className="empty-state">Carregando imóveis...</p>}
        {!loading && imoveis.length === 0 && !feedback && <p className="empty-state">Nenhum imóvel disponível no momento.</p>}
        {imoveis.map((imovel) => (
          <article className={`property-card${imovelSelecionado === imovel.codigo ? " property-card-selected" : ""}`} key={imovel.codigo}>
            <div className="property-art" aria-hidden="true"><span>⌂</span><small>MORAR BEM</small></div>
            <div className="property-info">
              <span className="property-code">CÓDIGO {imovel.codigo}</span>
              <h2>{imovel.titulo}</h2>
              <p className="property-price">R$ {imovel.preco}</p>
              <button
                className={`button ${imovelSelecionado === imovel.codigo ? "button-secondary" : "button-save"} property-button`}
                type="button"
                onClick={() => {
                  setImovelSelecionado(imovel.codigo);
                  setFeedback(null);
                }}
              >
                {imovelSelecionado === imovel.codigo ? "Selecionado" : "Tenho interesse"}
              </button>
            </div>
          </article>
        ))}
      </section>
      {imovelSelecionado && (
        <form className="lead-form" onSubmit={submitLead}>
          <div><span className="eyebrow">FALE COM UM CORRETOR</span><h2>Vamos conversar?</h2><p>Interesse no imóvel <strong>{imovelSelecionado}</strong>. Informe seu telefone.</p></div>
          <label className="field"><span>Seu telefone <b>*</b></span><input type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" value={telefone} onChange={(event) => setTelefone(event.target.value)} required /></label>
          <button className="button button-primary" type="submit">Enviar meu contato <span aria-hidden="true">→</span></button>
        </form>
      )}
      <footer className="showcase-footer">© 2026 Morar Bem Imobiliária.</footer>
    </main>
  );
}

export default App;
