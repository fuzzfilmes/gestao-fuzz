import React, { useState } from "react";
import { supabase } from "./lib/supabaseClient.js";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError("Email ou senha inválidos.");
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
        onSubmit={handleSubmit}
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
          <p style={{ color: "#7D848C", fontSize: 13, margin: 0 }}>Fuzz Produtora</p>
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
            autoComplete="current-password"
          />
        </label>

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
          {loading ? "Entrando..." : "Entrar"}
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
