import React, { useState } from "react";
import { supabase } from "./lib/supabaseClient.js";

export default function Login() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  function switchMode(novoModo) {
    setMode(novoModo);
    setError("");
    setInfo("");
    setPassword("");
    setConfirmPassword("");
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError("Email ou senha inválidos.");
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message === "User already registered" ? "Já existe uma conta com esse email." : "Não consegui criar a conta. Tente de novo.");
      return;
    }
    if (!data.session) {
      setInfo("Conta criada! Verifique seu email pra confirmar antes de entrar.");
      setPassword("");
      setConfirmPassword("");
    }
    // Se a confirmação de email estiver desligada no projeto Supabase,
    // data.session já vem preenchida e o listener em main.jsx troca pra
    // a tela principal sozinho, sem precisar de nada aqui.
  }

  const isSignup = mode === "signup";

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
        onSubmit={isSignup ? handleSignup : handleLogin}
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
            {isSignup ? "Criar sua conta" : "Fuzz Produtora"}
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

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ color: "#7D848C", fontSize: 12 }}>Senha</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            autoComplete={isSignup ? "new-password" : "current-password"}
          />
        </label>

        {isSignup && (
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ color: "#7D848C", fontSize: 12 }}>Confirmar senha</span>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={inputStyle}
              autoComplete="new-password"
            />
          </label>
        )}

        {error && (
          <div style={{ color: "#FF3B30", fontSize: 12.5 }}>{error}</div>
        )}
        {info && (
          <div style={{ color: "#4FA8A0", fontSize: 12.5 }}>{info}</div>
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
          {loading ? (isSignup ? "Criando..." : "Entrando...") : (isSignup ? "Criar conta" : "Entrar")}
        </button>

        <button
          type="button"
          onClick={() => switchMode(isSignup ? "login" : "signup")}
          style={{
            background: "none",
            border: "none",
            color: "#7D848C",
            fontSize: 12.5,
            cursor: "pointer",
            padding: 0,
          }}
        >
          {isSignup ? "Já tem uma conta? Entrar" : "Não tem conta? Criar conta"}
        </button>
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
