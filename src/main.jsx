import React, { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { supabase } from "./lib/supabaseClient.js";
import { getPainelEquipe } from "./lib/api.js";
import Login from "./Login.jsx";
import App from "./App.jsx";
import PainelEquipe from "./PainelEquipe.jsx";
import "./index.css";

function Aviso({ children }) {
  return <div style={{ color: "#9aa0a8", fontFamily: "sans-serif", fontSize: 14, textAlign: "center", padding: 40 }}>{children}</div>;
}

// Decide qual tela abrir: o painel completo (dono) ou o painel da equipe.
// Enquanto não souber quem é a pessoa, nenhuma das duas é montada.
function Area({ userId }) {
  const [acesso, setAcesso] = useState(null);

  const carregar = useCallback(async () => {
    try {
      const dados = await getPainelEquipe();
      setAcesso((atual) => {
        if (dados) return { tipo: "equipe", dados };
        return atual?.tipo === "equipe" || atual?.tipo === "removido" ? { tipo: "removido" } : { tipo: "dono" };
      });
    } catch (e) {
      console.error("Falha ao verificar o acesso", e);
      // Numa atualização em segundo plano, mantém o que já está na tela.
      setAcesso((atual) => atual && atual.tipo !== "erro" ? atual : { tipo: "erro" });
    }
  }, [userId]);

  useEffect(() => { carregar(); }, [carregar]);

  if (!acesso) return <Aviso>Carregando…</Aviso>;
  if (acesso.tipo === "equipe") return <PainelEquipe dados={acesso.dados} onAtualizar={carregar} />;
  if (acesso.tipo === "dono") return <App />;
  return (
    <Aviso>
      <p>{acesso.tipo === "removido" ? "Seu acesso foi removido." : "Não consegui verificar seu acesso. Confira a internet e tente de novo."}</p>
      {acesso.tipo === "erro" && <button onClick={() => { setAcesso(null); carregar(); }}>Tentar de novo</button>}{" "}
      <button onClick={() => supabase.auth.signOut()}>Sair</button>
    </Aviso>
  );
}

function Root() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;
  return session ? <Area key={session.user.id} userId={session.user.id} /> : <Login />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
