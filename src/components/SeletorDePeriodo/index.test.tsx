import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";
import SeletorDePeriodo from ".";
import { PERIODOS_DE_DINHEIRO } from "../../constants/periodos";
import type { IntervaloDeDatas, OpcaoDeMenu } from "../../types";

function montar(
  periodoId = "todos",
  intervaloPersonalizado?: IntervaloDeDatas,
  blocos?: readonly (readonly OpcaoDeMenu[])[],
) {
  const onMudar = vi.fn();
  renderComProviders(
    <SeletorDePeriodo
      periodoId={periodoId}
      intervaloPersonalizado={intervaloPersonalizado}
      blocos={blocos}
      onMudar={onMudar}
    />,
  );
  return onMudar;
}

/** A pílula pelo atributo do Popover: por texto ela colidiria com a opção
 * "Todos os períodos" de dentro do painel, que tem o mesmo nome. */
function pilula() {
  return document.querySelector<HTMLElement>('[data-scope="popover"][data-part="trigger"]')!;
}

/** As buscas de opção precisam ser DENTRO do painel, pelo mesmo motivo. */
function painel() {
  return within(document.querySelector<HTMLElement>('[data-scope="popover"][data-part="content"]')!);
}

async function abrirPainel(user: ReturnType<typeof userEvent.setup>) {
  await user.click(pilula());
  await screen.findByRole("dialog");
}

describe("SeletorDePeriodo", () => {
  it("a pílula mostra o período escolhido", () => {
    montar("ult7");
    expect(pilula()).toHaveTextContent("Últimos 7 dias");
  });

  it("id desconhecido não deixa a pílula em branco", () => {
    // Estado antigo salvo, id renomeado -- a pílula tem que dizer alguma
    // coisa, e "Todos os períodos" é o que de fato está sendo aplicado
    // (`intervaloDoPeriodo` devolve `null` pra id desconhecido).
    montar("periodo-de-uma-versao-antiga");
    expect(pilula()).toHaveTextContent("Todos os períodos");
  });

  it("oferece as 11 opções do artifact, futuro e passado separados", async () => {
    const user = userEvent.setup();
    montar();
    await abrirPainel(user);

    for (const rotulo of [
      "Todos os períodos",
      "Hoje", "Amanhã", "Esta semana", "Este mês",
      "Próximos 3 dias", "Próxima semana", "Próximo mês",
      "Ontem", "Últimos 7 dias", "Últimos 30 dias",
      "Definir período…",
    ]) {
      expect(painel().getByRole("button", { name: rotulo })).toBeInTheDocument();
    }
  });

  it("escolher uma opção avisa quem chama e fecha o painel", async () => {
    const user = userEvent.setup();
    const onMudar = montar();
    await abrirPainel(user);
    await user.click(painel().getByRole("button", { name: "Ontem" }));

    expect(onMudar).toHaveBeenCalledWith("ontem");
    // `waitFor`: o Popover desmonta na saída, e o desmonte não acontece no
    // mesmo tique do clique.
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("a pílula fica ATIVA em qualquer período que não seja 'todos'", () => {
    // Filtro ligado que parece desligado faz a pessoa ver um quadro
    // incompleto achando que vê tudo.
    montar("hoje");
    expect(pilula()).toHaveAttribute("data-ativo");
  });

  it("'todos' deixa a pílula apagada", () => {
    montar("todos");
    expect(pilula()).not.toHaveAttribute("data-ativo");
  });

  describe("intervalo personalizado", () => {
    it("'Definir período…' troca a lista pelo calendário, sem fechar o painel", async () => {
      const user = userEvent.setup();
      montar();
      await abrirPainel(user);
      await user.click(painel().getByRole("button", { name: "Definir período…" }));

      expect(painel().getByText("De")).toBeInTheDocument();
      expect(painel().getByText("Até")).toBeInTheDocument();
      // A lista saiu, o painel ficou.
      expect(painel().queryByRole("button", { name: "Este mês" })).not.toBeInTheDocument();
    });

    it("'Voltar' devolve a lista", async () => {
      const user = userEvent.setup();
      montar();
      await abrirPainel(user);
      await user.click(painel().getByRole("button", { name: "Definir período…" }));
      await user.click(painel().getByRole("button", { name: "Voltar" }));

      expect(painel().getByRole("button", { name: "Este mês" })).toBeInTheDocument();
    });

    it("a pílula mostra as duas datas, não a palavra 'Personalizado'", () => {
      // "Personalizado" não diz QUE período é -- e é justamente a única
      // opção cujo nome não carrega a informação.
      montar("personalizado", { de: "2026-08-03", ate: "2026-09-14" });
      expect(pilula()).toHaveTextContent("03/08/2026 – 14/09/2026");
    });

    it("'Aplicar' fica travado enquanto o intervalo está pela metade", async () => {
      const user = userEvent.setup();
      montar();
      await abrirPainel(user);
      await user.click(painel().getByRole("button", { name: "Definir período…" }));

      expect(painel().getByRole("button", { name: "Aplicar" })).toBeDisabled();
    });

    it("intervalo invertido trava e DIZ o motivo", async () => {
      // Travar sem explicar faz a pessoa procurar o que faltou.
      const user = userEvent.setup();
      montar("personalizado", { de: "2026-09-14", ate: "2026-08-03" });
      await abrirPainel(user);
      await user.click(painel().getByRole("button", { name: "Definir período…" }));

      expect(painel().getByText("A data inicial vem depois da final.")).toBeInTheDocument();
      expect(painel().getByRole("button", { name: "Aplicar" })).toBeDisabled();
    });

    it("'Aplicar' entrega o intervalo com o id personalizado", async () => {
      const user = userEvent.setup();
      const onMudar = montar("personalizado", { de: "2026-08-03", ate: "2026-09-14" });
      await abrirPainel(user);
      await user.click(painel().getByRole("button", { name: "Definir período…" }));
      await user.click(painel().getByRole("button", { name: "Aplicar" }));

      expect(onMudar).toHaveBeenCalledWith("personalizado", {
        de: "2026-08-03",
        ate: "2026-09-14",
      });
    });
  });
});

describe("os blocos vêm de fora", () => {
  it("sem a prop, mostra os do Kanban", async () => {
    /* 🔴 O padrão existe para o Kanban e a Agenda não mudarem: elas já usavam
       esta pílula, e o Financeiro é quem chegou depois com opções próprias. */
    const user = userEvent.setup();
    montar();
    await abrirPainel(user);
    expect(painel().getByRole("button", { name: "Amanhã" })).toBeInTheDocument();
    expect(painel().queryByRole("button", { name: "Este ano" })).not.toBeInTheDocument();
  });

  it("com os blocos do dinheiro, troca a lista inteira", async () => {
    const user = userEvent.setup();
    montar("todos", undefined, PERIODOS_DE_DINHEIRO);
    await abrirPainel(user);
    expect(painel().getByRole("button", { name: "Este ano" })).toBeInTheDocument();
    expect(painel().getByRole("button", { name: "Mês passado" })).toBeInTheDocument();
    // ⚠️ As opções de DIA ficam de fora: dinheiro se conta em mês.
    expect(painel().queryByRole("button", { name: "Amanhã" })).not.toBeInTheDocument();
    expect(painel().queryByRole("button", { name: "Próximos 3 dias" })).not.toBeInTheDocument();
  });

  it("⚠️ 'Todos os períodos' e 'Definir período…' seguem fixos", async () => {
    /* Eles não são um período da lista -- são o sem-limite e a porta do
       calendário. Deixá-los configuráveis convidaria a esquecer um deles. */
    const user = userEvent.setup();
    montar("todos", undefined, PERIODOS_DE_DINHEIRO);
    await abrirPainel(user);
    expect(painel().getByRole("button", { name: "Todos os períodos" })).toBeInTheDocument();
    expect(painel().getByRole("button", { name: "Definir período…" })).toBeInTheDocument();
  });

  it("🔴 o rótulo da pílula lê os blocos DESTA tela", () => {
    /* Com uma lista fixa, "Este ano" não seria achado entre as opções do
       Kanban e a pílula mostraria "Todos os períodos" com um período
       escolhido -- a tela mentindo sobre o próprio filtro. */
    montar("ano", undefined, PERIODOS_DE_DINHEIRO);
    expect(pilula()).toHaveTextContent("Este ano");
  });

  it("⚠️ e o par negativo: sem os blocos certos, ele mentiria", () => {
    montar("ano");
    expect(pilula()).toHaveTextContent("Todos os períodos");
  });
});
