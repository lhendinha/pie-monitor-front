import { Table } from "@chakra-ui/react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../../../test/queryTestUtils";

import LinhaDaInscricao from "./index";
import type { InscricaoAvulsa, Subgrupo } from "../../../../types";

const SUBGRUPOS: Subgrupo[] = [
  { subgrupo_id: "s-civel", nome: "Cível" },
  { subgrupo_id: "s-trab", nome: "Trabalhista" },
];

const DESLIGADA: InscricaoAvulsa = {
  inscricao: "263/MG",
  importacao_automatica: false,
  subgrupos_destino: [],
};

const LIGADA: InscricaoAvulsa = {
  inscricao: "263/MG",
  importacao_automatica: true,
  subgrupos_destino: ["s-civel", "s-trab"],
};

const abrir = vi.fn();
const desligar = vi.fn();
const remover = vi.fn();

beforeEach(() => vi.clearAllMocks());

function montar(inscricao = DESLIGADA, subgrupos = SUBGRUPOS, emAndamento = false) {
  /* ⚠️ Dentro de `<Table.Root><Table.Body>`: o componente é uma `Table.Row`, e
     uma linha de tabela solta no DOM não recebe o papel `row` -- os
     `getByRole` daqui não achariam nada. */
  renderComProviders(
    <Table.Root>
      <Table.Body>
        <LinhaDaInscricao
          inscricao={inscricao}
          subgrupos={subgrupos}
          emAndamento={emAndamento}
          onAbrir={abrir}
          onDesligar={desligar}
          onRemover={remover}
        />
      </Table.Body>
    </Table.Root>,
  );
}

/** 🔴 O nome acessível é `"263/MG Ligada"` -- os DOIS ids, e não um
 * `aria-label`. Medido: com `Switch.Label` presente o Chakra emite
 * `aria-labelledby`, que vence o `aria-label` em silêncio; sem os dois ids as
 * 50 linhas teriam interruptores todos chamados "Desligada". */
const interruptor = () =>
  screen.getByRole("checkbox", { name: /^263\/MG (Ligada|Desligada)$/ });

// ── 🔴 o interruptor é assimétrico, e é de propósito ──────────────────────

describe("o interruptor", () => {
  it("LIGAR abre o modal, e não grava nada", async () => {
    /* 🔴 O servidor ZERA `subgrupos_destino` ao desligar e RECUSA ligar sem
       destino -- então uma inscrição desligada nunca tem destino guardado, e
       "ligar" num clique só cairia sempre em 400. O modal é onde o destino se
       escolhe.

       A mutação que este teste mata: fazer o interruptor gravar `true` direto,
       como o desligar faz. */
    const user = userEvent.setup();
    montar();

    await user.click(interruptor());

    expect(abrir).toHaveBeenCalledOnce();
    expect(desligar).not.toHaveBeenCalled();
  });

  it("DESLIGAR grava direto -- não precisa de informação nenhuma", async () => {
    /* O par assimétrico do de cima. Obrigar a abrir um modal para dizer
       "pare" seria atrito puro, e sem este teste a regra acima poderia ser
       "lida" como "o interruptor sempre abre o modal". */
    const user = userEvent.setup();
    montar(LIGADA);

    await user.click(interruptor());

    expect(desligar).toHaveBeenCalledOnce();
    expect(abrir).not.toHaveBeenCalled();
  });

  it("🔴 se chama pela INSCRIÇÃO e pelo estado, não só pelo estado", async () => {
    /* A mutação que este teste mata: voltar ao `aria-label`, que o
       `aria-labelledby` do Chakra ignora -- ou apontar só para o rótulo do
       estado. Nos dois casos as 50 linhas viram "Desligada", e quem navega por
       leitor de tela não distingue uma da outra. */
    montar(LIGADA);
    expect(screen.getByRole("checkbox", { name: "263/MG Ligada" })).toBeInTheDocument();
  });

  it("diz o estado por ESCRITO, e não só pela posição", async () => {
    /* Cor e posição sozinhas não contam o estado a quem não as distingue --
       mesma régua de "(Inativa)" em `LinhaDeOpcao`. */
    montar(LIGADA);
    expect(screen.getByText("Ligada")).toBeInTheDocument();
    expect(screen.queryByText("Desligada")).not.toBeInTheDocument();
  });

  it("e o texto acompanha o estado desligado", async () => {
    montar(DESLIGADA);
    expect(screen.getByText("Desligada")).toBeInTheDocument();
  });
});

// ── os destinos ───────────────────────────────────────────────────────────

describe("a coluna de destinos", () => {
  it("mostra o NOME de cada subgrupo, não o id", async () => {
    montar(LIGADA);

    expect(screen.getByText("Cível")).toBeInTheDocument();
    expect(screen.getByText("Trabalhista")).toBeInTheDocument();
    expect(screen.queryByText("s-civel")).not.toBeInTheDocument();
  });

  it("cai no id quando o subgrupo não existe mais -- e não some calada", async () => {
    /* 🔴 O par que a busca por nome esconderia: um destino apontando para
       subgrupo apagado. Sumir a etiqueta faria a linha parecer sem destino
       tendo um -- e a pessoa religaria achando que precisa escolher. */
    montar({ ...LIGADA, subgrupos_destino: ["s-sumiu"] });

    expect(screen.getByText("s-sumiu")).toBeInTheDocument();
  });

  it("🔴 de TRÊS em diante vira contagem, e a linha não cresce", async () => {
    /* Um grupo pode ter 20 subgrupos. Vinte etiquetas quebram em quatro
       fileiras: a linha cresce, as vizinhas não, e a coluna do interruptor
       descola do que ela descreve.

       ⚠️ É a régua de `utils/select.rotuloResumo`, que o `MultiSelect` do modal
       aplica ao MESMO dado -- duas maneiras de resumir a mesma lista na mesma
       tela divergem no primeiro ajuste. */
    montar({ ...LIGADA, subgrupos_destino: ["s-civel", "s-trab", "s-terceiro"] });

    expect(screen.getByText("3 subgrupos")).toBeInTheDocument();
    expect(screen.queryByText("Cível")).not.toBeInTheDocument();
  });

  it("com DOIS ainda mostra os nomes -- o teto é em três, não em dois", async () => {
    /* O par que fixa a fronteira: um `< 2` esconderia o caso mais comum, e um
       `<= 3` deixaria a linha crescer justamente onde ela já aperta. */
    montar(LIGADA);
    expect(screen.getByText("Cível")).toBeInTheDocument();
    expect(screen.queryByText(/subgrupos$/)).not.toBeInTheDocument();
  });

  it("e o title carrega a lista INTEIRA -- nada se perde no resumo", async () => {
    montar({ ...LIGADA, subgrupos_destino: ["s-civel", "s-trab", "s-terceiro"] });

    expect(screen.getByText("3 subgrupos").parentElement).toHaveAttribute(
      "title",
      "Cível, Trabalhista, s-terceiro",
    );
  });

  it("sem destino, mostra o travessão -- célula vazia se lê como dado faltando", async () => {
    montar(DESLIGADA);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

// ── os outros dois gestos ─────────────────────────────────────────────────

it("clicar na inscrição abre o modal -- é lá que se edita", async () => {
  const user = userEvent.setup();
  montar();

  await user.click(screen.getByRole("button", { name: "263/MG" }));

  expect(abrir).toHaveBeenCalledOnce();
});

it("remover avisa o pai -- quem confirma é o modal, lá em cima", async () => {
  const user = userEvent.setup();
  montar();

  await user.click(screen.getByRole("button", { name: "Remover 263/MG" }));

  expect(remover).toHaveBeenCalledOnce();
});

it("o remover é a LIXEIRA do sistema, e não o × do artifact", async () => {
  /* O artifact desenha um × redondo, mas Subgrupos, Clientes e Membros já
     usam `BotaoQuadrado tom="perigo"` com a lixeira para "tirar da lista". Um
     segundo desenho para a mesma ação faria a pessoa aprender duas vezes.

     ⚠️ Guarda de FORMA: o jsdom não calcula estilo, então o que dá para cobrar
     é o título -- "Remover inscrição", o texto que o `BotaoQuadrado` leva. */
  montar();
  expect(screen.getByRole("button", { name: "Remover 263/MG" })).toHaveAttribute(
    "title",
    "Remover inscrição",
  );
});

it("com uma gravação em voo, a linha inteira fica travada", async () => {
  montar(DESLIGADA, SUBGRUPOS, true);

  expect(interruptor()).toBeDisabled();
  expect(screen.getByRole("button", { name: "Remover 263/MG" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "263/MG" })).toBeDisabled();
});
