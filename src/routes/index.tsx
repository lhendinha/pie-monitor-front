import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell, RotaPorPapel, RotaProtegida } from "../components";
import { useSessaoContexto } from "../contexts/SessaoContext";
import {
  ClienteDetalhePage,
  ClientesPage,
  GrupoPage,
  AgendaPage,
  AtendimentoDetalhePage,
  AtendimentosPage,
  KanbanPage,
  PerfilPage,
  ProcessoDetalhePage,
  ProcessosPage,
} from "../pages";
import RotaConvite from "./RotaConvite";
import RotaEsqueciSenha from "./RotaEsqueciSenha";
import RotaHistorico from "./RotaHistorico";
import RotaLogin from "./RotaLogin";
import RotaRaiz from "./RotaRaiz";
import RotaRedefinirSenha from "./RotaRedefinirSenha";
import RotaTarefa from "./RotaTarefa";

/** O mapa de rotas da aplicação.
 *
 * Mora aqui, e não no `App.tsx`, porque é a única coisa que este arquivo
 * faz -- enquanto o `App` existe pra montar os provedores. Os componentes
 * de rota que precisam de casca própria (`RotaLogin`, `RotaTarefa`,
 * `RotaRaiz`...) já eram vizinhos nesta pasta; faltava o mapa que os liga.
 *
 * ⚠️ Precisa renderizar DENTRO do `SessaoProvider`: `RotaProtegida` e
 * `RotaLogin` leem a sessão pelo contexto, e `AppShell` recebe o `sair`
 * daqui.
 */
export default function Rotas() {
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
          <Route path="/agenda" element={<AgendaPage />} />
          <Route path="/atendimentos" element={<AtendimentosPage />} />
          {/* O par (subgrupo, id) porque é a chave primária -- o
              atendimento não é endereçável só pelo id. */}
          <Route
            path="/atendimentos/:subgrupoId/:atendimentoId"
            element={<AtendimentoDetalhePage />}
          />
          {/* O link do lembrete de prazo. Abre o quadro do subgrupo com o
              modal da tarefa já carregado -- ver `RotaTarefa`. */}
          <Route
            path="/tarefas/:subgrupoId/:tarefaId"
            element={<RotaTarefa />}
          />
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
