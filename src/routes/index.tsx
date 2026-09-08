import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell, RotaPorPapel, RotaProtegida } from "../components";
import { useSessaoContexto } from "../contexts/SessaoContext";
import {
  AgendaPage,
  AtendimentoDetalhePage,
  AtendimentosPage,
  ClienteDetalhePage,
  ClientesPage,
  DocumentoDetalhePage,
  DocumentosPage,
  FaturaDetalhePage,
  FinanceiroPage,
  GrupoPage,
  KanbanPage,
  LancamentoDetalhePage,
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
          <Route path="/documentos" element={<DocumentosPage />} />
          {/* O par (subgrupo, id) porque é a chave primária -- o documento
              não é endereçável só pelo id. A tela se hidrata sozinha por
              `GET /subgrupos/{sg}/documentos/{id}`: é rota, então tem que
              aguentar um F5 e um link colado. */}
          <Route
            path="/documentos/:subgrupoId/:documentoId"
            element={<DocumentoDetalhePage />}
          />
          <Route path="/perfil" element={<PerfilPage />} />
          <Route path="/historico" element={<RotaHistorico />} />
          {/* `financeiro`, igual ao piso do item no menu lateral. O papel
              foi criado para esta seção, e quem é `user` não entra nem
              digitando o endereço. */}
          <Route element={<RotaPorPapel minimo="financeiro" />}>
            <Route path="/financeiro" element={<FinanceiroPage />} />
            {/* 🔴 Dentro do MESMO guarda de papel da lista. A tela mostra
                valor, conta e rateio -- deixá-la fora do `financeiro` seria
                fechar a porta e esquecer a janela. */}
            <Route
              path="/financeiro/lancamentos/:lancamentoId"
              element={<LancamentoDetalhePage />}
            />
            {/* 🔴 No mesmo guarda, e pelo mesmo motivo: a fatura mostra
                valor, cliente e cada linha cobrada. E ela É endereço --
                a emissão manda para cá assim que o documento sai, e a
                lista de Emitidas aponta para cá. */}
            <Route
              path="/financeiro/faturas/:faturaId"
              element={<FaturaDetalhePage />}
            />
          </Route>
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
