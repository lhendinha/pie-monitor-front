import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/** O "Voltar" de uma tela de detalhe, preservando a lista como ela estava.
 *
 * 🔴 `navegar("/processos")` monta a listagem do ZERO -- e desde que página,
 * tamanho e filtros moram na URL, isso significa jogar fora exatamente o que
 * a pessoa tinha escolhido. Quem estava na página 2 com 30 por página voltava
 * para a página 1 com 10.
 *
 * Voltar no HISTÓRICO devolve a entrada anterior inteira, com a query que ela
 * carregava. É de graça: quem clicou numa linha deixou a lista atrás.
 *
 * ⚠️ **`destino` não é sobra**: esta tela também é alcançada por link direto
 * -- do e-mail de lembrete, do Kanban, da Agenda -- e por recarregar a
 * página. Aí não HÁ entrada anterior, e um `navegar(-1)` levaria a pessoa
 * para fora do sistema.
 *
 * ⚠️ `location.key === "default"` é como o React Router marca a PRIMEIRA
 * entrada. Medido nos dois ambientes: `window.history.state.idx` existe no
 * navegador e não no `MemoryRouter` dos testes; a chave existe nos dois.
 */
export function useVoltarParaLista(destino: string) {
  const navegar = useNavigate();
  const { key } = useLocation();

  return useCallback(() => {
    if (key === "default") navegar(destino);
    else navegar(-1);
  }, [key, navegar, destino]);
}
