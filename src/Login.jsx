import React, { useState } from "react";
import { supabase } from "./lib/supabaseClient.js";

function mensagemDeErro(error) {
  const m = (error.message || "").toLowerCase();
  if (m.includes("already registered")) return "Esse email já tem senha. Entre com ela ou peça um novo código à Fuzz.";
  if (m.includes("signups not allowed") || m.includes("signup is disabled")) return "O primeiro acesso está desativado no momento. Avise a Fuzz.";
  if (m.includes("database error")) return "Email ou código não conferem, ou o código expirou.";
  if (m.includes("rate limit")) return "Muitas tentativas. Aguarde alguns minutos.";
  if (m.includes("password")) return "Senha não aceita. Use uma senha mais forte.";
  return "Não consegui criar o acesso. Confira os dados e tente de novo.";
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [primeiroAcesso, setPrimeiroAcesso] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError("Email ou senha inválidos.");
  }

  function alternarModo() {
    setPrimeiroAcesso(!primeiroAcesso);
    setError("");
    setPassword("");
    setConfirmacao("");
    setCodigo("");
  }

  // Primeiro acesso da equipe: o banco só cria a conta se o código conferir com o email.
  async function handlePrimeiroAcesso(e) {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("A senha precisa ter pelo menos 8 caracteres.");
    if (password !== confirmacao) return setError("As senhas não conferem.");
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { codigo_acesso: codigo.trim() } },
    });
    setLoading(false);
    if (error) setError(mensagemDeErro(error));
    else if (!data.session) setError("Não foi possível entrar automaticamente. Avise a Fuzz.");
    // Com a sessão criada, o main.jsx abre o painel sozinho.
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0A0B0D",
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      <form
        onSubmit={primeiroAcesso ? handlePrimeiroAcesso : handleLogin}
        style={{
          width: 320,
          background: "#131519",
          border: "1px solid #262A30",
          borderRadius: 12,
          padding: "32px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ color: "#E8EAED", fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>
            Painel de Produção
          </h1>
          <p style={{ color: "#7D848C", fontSize: 13, margin: 0 }}>
            {primeiroAcesso ? "Primeiro acesso: crie a sua senha" : "Fuzz Produtora"}
          </p>
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ color: "#7D848C", fontSize: 12 }}>Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            autoComplete="email"
          />
        </label>

        {primeiroAcesso && (
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ color: "#7D848C", fontSize: 12 }}>Código de primeiro acesso</span>
            <input
              required
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              style={inputStyle}
              placeholder="XXXXX-XXXXX"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
            />
          </label>
        )}

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ color: "#7D848C", fontSize: 12 }}>{primeiroAcesso ? "Crie sua senha (mínimo 8 caracteres)" : "Senha"}</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            autoComplete={primeiroAcesso ? "new-password" : "current-password"}
          />
        </label>

        {primeiroAcesso && (
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ color: "#7D848C", fontSize: 12 }}>Repita a senha</span>
            <input
              type="password"
              required
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              style={inputStyle}
              autoComplete="new-password"
            />
          </label>
        )}

        {error && (
          <div style={{ color: "#FF3B30", fontSize: 12.5 }}>{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 8,
            background: "#FF3B30",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 0",
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? (primeiroAcesso ? "Criando..." : "Entrando...") : primeiroAcesso ? "Criar senha e entrar" : "Entrar"}
        </button>

        <button
          type="button"
          onClick={alternarModo}
          style={{ background: "none", border: "none", color: "#7D848C", fontSize: 12.5, cursor: "pointer", padding: 0 }}
        >
          {primeiroAcesso ? "Já tenho senha — entrar" : "Primeiro acesso"}
        </button>
        {!primeiroAcesso && (
          <p style={{ color: "#5c636b", fontSize: 11.5, margin: 0, textAlign: "center" }}>
            Esqueceu a senha? Peça um novo código à Fuzz.
          </p>
        )}

      </form>
    </div>
  );
}

const inputStyle = {
  background: "#1B1E23",
  border: "1px solid #262A30",
  borderRadius: 8,
  padding: "9px 10px",
  color: "#E8EAED",
  fontSize: 14,
  outline: "none",
};
