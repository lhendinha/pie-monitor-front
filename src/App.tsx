import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppShell, RotaPorPapel, RotaProtegida, ToastProvider } from "./components";
import { SessaoProvider, useSessaoContexto } from "./contexts/SessaoContext";
import {
  ClienteDetalhePage,
  ClientesPage,
  GrupoPage,
  KanbanPage,
  PerfilPage,
  ProcessoDetalhePage,
  ProcessosPage,
} from "./pages";
import RotaConvite from "./routes/RotaConvite";
import RotaEsqueciSenha from "./routes/RotaEsqueciSenha";
import RotaHistorico from "./routes/RotaHistorico";
import RotaLogin from "./routes/RotaLogin";
import RotaRaiz from "./routes/RotaRaiz";
import RotaRedefinirSenha from "./routes/RotaRedefinirSenha";

/** As rotas propriamente ditas. Separado do `App` porque precisa estar
 * DENTRO do `SessaoProvider` -- `RotaProtegida` e `RotaLogin` leem a sessão
 * pelo contexto. */
function Rotas() {
  const { sair } = useSessaoContexto();

  return (
    <Routes>
      {/* Públicas. Chegam por link de e-mail e não passam pelo portão. */}
      <Route path="/login" element={<RotaLogin />} />
      <Route path="/esqueci-senha" element={<RotaEsqueciSenha />} />
      <Route path="/convite/:token" element={<RotaConvite />} />
      <Route path="/redefinir-senha/:token" element={<RotaRedefinirSenha />} />

      <Route element={<RotaProtegida />}>
        <Route element={<AppShell onSair={sair} />}>
          <Route index element={<RotaRaiz />} />
          <Route path="/kanban" element={<KanbanPage />} />
          <Route path="/processos" element={<ProcessosPage />} />
          {/* Detalhe é rota: o e-mail de lembrete linka direto pra cá, e a
              tela se hidrata sozinha pelo número. O subgrupo está no
              caminho porque o mesmo número pode viver em mais de um. */}
          <Route
            path="/processos/:subgrupoId/:numero"
            element={<ProcessoDetalhePage />}
          />
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/clientes/:clienteId" element={<ClienteDetalhePage />} />
          <Route path="/perfil" element={<PerfilPage />} />
          <Route path="/historico" element={<RotaHistorico />} />
          {/* `manager`, igual ao piso do item no menu lateral. Esconder do
              menu sem fechar a rota era cosmético: bastava digitar o
              endereço pra entrar. */}
          <Route element={<RotaPorPapel minimo="manager" />}>
            <Route path="/grupo" element={<GrupoPage />} />
          </Route>
        </Route>
      </Route>

      {/* Caminho desconhecido cai na raiz em vez de tela branca. Vale pros
          caminhos que ainda não existem (/kanban, /agenda…): enquanto a tela
          não chega, o link não quebra. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <SessaoProvider>
        <BrowserRouter>
          <Rotas />
        </BrowserRouter>
      </SessaoProvider>
    </ToastProvider>
  );
}
