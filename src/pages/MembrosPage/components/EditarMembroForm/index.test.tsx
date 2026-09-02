import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderComProviders } from "../../../../test/queryTestUtils";
import type { Grupo, Membro, Subgrupo } from "../../../../types";

const mocks = vi.hoisted(() => ({
  listarTodosOsMembrosDoGrupo: vi.fn(),
  listarSubgruposDoGrupo: vi.fn(),
  atualizarMembro: vi.fn(),
  lerMembro: vi.fn(),
  getGrupoId: vi.fn(),
  papelAtende: vi.fn(),
  ehSuperAdmin: vi.fn(),
}));

vi.mock("../../../../services", () => mocks);

import EditarMembroForm from "./index";
import { FALHOU_AO_CONFERIR_SUBGRUPOS } from "../../../../constants/subgrupos";

// Dois grupos: o teste de destravar precisa ter pra onde trocar.
const grupos: Grupo[] = [
  { grupo_id: "g1", nome: "Grupo 1" },
  { grupo_id: "g2", nome: "Grupo 2" },
];
const subgrupos: Subgrupo[] = [{ subgrupo_id: "s1", nome: "Subgrupo 1", grupo_id: "g1" }];

function montarMembro(overrides: Partial<Membro> = {}): Membro {
  return { email: "fulano@x.com", apelido: "Fulano", papel: "user", subgrupos: ["s1"], ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getGrupoId.mockReturnValue("g1");
  /* ⚠️ O modal LÊ o registro editável -- a inscrição não vem na listagem, e
     não pode vir: `GET /grupos/membros` é `manager`+ e a projeção dela é fixa
     de propósito. */
  mocks.lerMembro.mockResolvedValue({
    email: "fulano@x.com", apelido: "Fulano", papel: "user", grupo_id: "g1",
    numero_oab: null, uf_oab: null,
    importacao_automatica: false, subgrupos_destino: [], subgrupos: ["s1"],
  });
  mocks.listarSubgruposDoGrupo.mockResolvedValue({ subgrupos });
  /* 🔴 TODA montagem chama isto -- é a recarga fresca dos subgrupos, num
     `useEffect` fora do React Query. Sem um padrão AQUI, o teste que não o
     define herda a implementação deixada pelo anterior: `vi.clearAllMocks()`
     zera as CHAMADAS, não a implementação.

     ⚠️ Na ordem declarada isso passava despercebido, porque o primeiro teste
     do arquivo define o mock e os seguintes pegavam carona. Com
     `--sequence.shuffle` o teste que não define pode rodar primeiro, e aí
     `listarTodosOsMembrosDoGrupo()` devolve `undefined` -- o componente faz
     `.then` nisso e a montagem estoura. Medido em 3 de 4 rodadas
     embaralhadas, 01/09/2026.

     Quem precisa de outra resposta continua sobrescrevendo no próprio teste. */
  mocks.listarTodosOsMembrosDoGrupo.mockResolvedValue({ membros: [montarMembro()] });
});

describe("EditarMembroForm", () => {
  it("sem nenhum subgrupo, a instrução vira alerta e o Salvar trava", async () => {
    // Sem subgrupo, a pessoa fica com conta ativa e sem enxergar processo
    // nenhum -- o servidor recusa (`SubgruposObrigatorios`), e aqui o botão
    // nem chega a ficar clicável.
    const membro = montarMembro({ subgrupos: [] });
    mocks.listarTodosOsMembrosDoGrupo.mockResolvedValue({ membros: [membro] });
    renderComProviders(
      <EditarMembroForm membro={membro} grupos={grupos} podeMoverEntreGrupos onAtualizado={vi.fn()} onFechar={vi.fn()} />
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Escolha pelo menos um subgrupo.");
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("com subgrupo, a mesma frase fica só como instrução", async () => {
    // O texto não muda porque a instrução não muda -- só a urgência dela.
    const membro = montarMembro({ subgrupos: ["s1"] });
    mocks.listarTodosOsMembrosDoGrupo.mockResolvedValue({ membros: [membro] });
    renderComProviders(
      <EditarMembroForm membro={membro} grupos={grupos} podeMoverEntreGrupos onAtualizado={vi.fn()} onFechar={vi.fn()} />
    );

    await waitFor(() => expect(screen.getByRole("button", { name: "Salvar" })).not.toBeDisabled());
    expect(screen.getByText("Escolha pelo menos um subgrupo.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("submete a atualização com os campos do formulário", async () => {
    const membro = montarMembro({ subgrupos: ["s1"] });
    mocks.listarTodosOsMembrosDoGrupo.mockResolvedValue({ membros: [membro] });
    mocks.atualizarMembro.mockResolvedValue({});
    const onAtualizado = vi.fn();
    const onFechar = vi.fn();
    const user = userEvent.setup();
    renderComProviders(
      <EditarMembroForm membro={membro} grupos={grupos} podeMoverEntreGrupos onAtualizado={onAtualizado} onFechar={onFechar} />
    );

    await waitFor(() => expect(screen.getByRole("button", { name: "Salvar" })).not.toBeDisabled());
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      /* ⚠️ Igualdade EXATA, e é ela que prova a garantia: um
         `objectContaining` deixaria passar campo que a aba não deveria mandar.
         Os quatro da inscrição viajam junto desde a Fase 1b -- o modal salva
         tudo num "Salvar" só. */
      expect(mocks.atualizarMembro).toHaveBeenCalledWith("fulano@x.com", {
        apelido: "Fulano",
        grupo_id: "g1",
        papel: "user",
        subgrupos: ["s1"],
        numero_oab: "",
        uf_oab: "",
        importacao_automatica: false,
        subgrupos_destino: [],
      })
    );
    expect(onAtualizado).toHaveBeenCalled();
    expect(onFechar).toHaveBeenCalled();
  });
});

describe("conferência dos subgrupos atuais", () => {
  it("🔴 falha ao conferir TRAVA o salvar, em vez de salvar o conjunto velho", async () => {
    /* O efeito anti-staleness usava `.then().finally()` SEM `.catch()`. O
     * `.finally` não converte rejeição: virava unhandled promise rejection,
     * nada aparecia pra pessoa, e `subgruposCarregados` virava `true` do
     * mesmo jeito -- o Salvar destravava com o conjunto VELHO da prop.
     *
     * O servidor reconcilia pelo conjunto exato enviado e solta as tarefas
     * de quem sai. Então um blip de rede num "Editar" aberto só pra corrigir
     * o apelido tirava a pessoa de um subgrupo que alguém tinha acabado de
     * adicionar, e as tarefas dela lá ficavam sem responsável. Sem aviso. */
    const membro = montarMembro({ subgrupos: ["s1"] });
    mocks.listarTodosOsMembrosDoGrupo.mockRejectedValue(new Error("rede caiu"));
    renderComProviders(
      <EditarMembroForm membro={membro} grupos={grupos} podeMoverEntreGrupos onAtualizado={vi.fn()} onFechar={vi.fn()} />
    );

    expect(
      await screen.findByText(/Não foi possível conferir os subgrupos atuais/),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Salvar/ })).toBeDisabled(),
    );
  });

  it("🔴 trocar de grupo limpa o bloqueio deixado por uma falha na recarga", async () => {
    /* `falhouAoRecarregar` bloqueia o Salvar porque a seleção pode estar
     * velha -- e enviar dado velho REMOVE a pessoa de subgrupos que alguém
     * acabou de adicionar. Mas nunca era limpo, e o efeito que o define só
     * reage a `[membro.email]`: um blip de rede travava o formulário até
     * fechar e reabrir o modal.
     *
     * Trocar o grupo descarta a seleção antiga, então o motivo do bloqueio
     * deixa de existir. */
    const membro = montarMembro();
    mocks.listarTodosOsMembrosDoGrupo.mockRejectedValue(new Error("rede"));
    const user = userEvent.setup();
    renderComProviders(
      <EditarMembroForm membro={membro} grupos={grupos} podeMoverEntreGrupos onAtualizado={vi.fn()} onFechar={vi.fn()} />
    );

    /* O aviso de "não consegui conferir" é o que o flag controla -- e é
     * ele que pode ser observado. O botão Salvar NÃO serve de sonda aqui:
     * trocar de grupo esvazia a seleção de subgrupos, então ele continua
     * desabilitado por outro motivo, legítimo. */
    expect(await screen.findByText(FALHOU_AO_CONFERIR_SUBGRUPOS)).toBeInTheDocument();

    /* ⚠️ O `Select` do projeto NÃO é um `<select>` nativo -- é um combobox
     * próprio (`Select.tsx`: "Substitui o `<select>` nativo"). O
     * `selectOptions` do user-event não funciona nele; abre e clica na
     * opção, como o teste do próprio componente faz. */
    await user.click(screen.getByText(grupos[0].nome));
    await user.click(await screen.findByText(grupos[1].nome));

    await waitFor(() =>
      expect(screen.queryByText(FALHOU_AO_CONFERIR_SUBGRUPOS)).not.toBeInTheDocument(),
    );
  });
});

// ── 🔴 a inscrição da OAB no modal (Fase 1b) ─────────────────────────────

describe("a inscrição da pessoa", () => {
  beforeEach(() => {
    /* ⚠️ A recarga fresca dos subgrupos roda em TODA montagem -- o `beforeEach`
       externo não a prepara porque os testes de cima a controlam caso a caso. */
    mocks.listarTodosOsMembrosDoGrupo.mockResolvedValue({
      membros: [{ email: "fulano@x.com", subgrupos: ["s1"] }],
    });
  });

  it("abre com a inscrição JÁ cadastrada, e não vazia", async () => {
    /* 🔴 A inscrição NÃO vem na listagem -- `GET /grupos/membros` é `manager`+
       e a projeção dela é fixa de propósito. Sem a leitura própria, o modal
       abriria vazio para quem já tem OAB, e um "Salvar" a apagaria. */
    mocks.lerMembro.mockResolvedValue({
      email: "fulano@x.com", apelido: "Fulano", papel: "user", grupo_id: "g1",
      numero_oab: "263", uf_oab: "MG",
      importacao_automatica: true, subgrupos_destino: ["s1"], subgrupos: ["s1"],
    });
    renderComProviders(
      <EditarMembroForm membro={montarMembro()} grupos={grupos} podeMoverEntreGrupos
        onAtualizado={vi.fn()} onFechar={vi.fn()} />
    );

    /* ⚠️ `waitFor`, e não asserção direta: o valor salvo chega por `useEffect`,
       DEPOIS do primeiro render -- `findByLabelText` resolve assim que o campo
       aparece, que pode ser antes. Sem isto o teste é intermitente. */
    const campo = await screen.findByLabelText(/Número da OAB/);
    await waitFor(() => expect(campo).toHaveValue("263"));
    await waitFor(() =>
      expect(screen.getByRole("checkbox", { name: /Cadastrar automaticamente/ }))
        .toBeChecked()
    );
  });

  it("manda a inscrição e o destino no MESMO Salvar", async () => {
    const user = userEvent.setup();
    mocks.lerMembro.mockResolvedValue({
      email: "fulano@x.com", apelido: "Fulano", papel: "user", grupo_id: "g1",
      numero_oab: "263", uf_oab: "MG",
      importacao_automatica: false, subgrupos_destino: [], subgrupos: ["s1"],
    });
    mocks.atualizarMembro.mockResolvedValue({});
    renderComProviders(
      <EditarMembroForm membro={montarMembro()} grupos={grupos} podeMoverEntreGrupos
        onAtualizado={vi.fn()} onFechar={vi.fn()} />
    );
    await screen.findByLabelText(/Número da OAB/);

    /* ⚠️ Com UM subgrupo marcado não há seletor de destino -- e o destino vai
       preenchido mesmo assim, senão "ligar" voltaria recusado do servidor. */
    await user.click(screen.getByText(/Cadastrar automaticamente/));
    await waitFor(() => expect(screen.getByRole("button", { name: "Salvar" })).not.toBeDisabled());
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(mocks.atualizarMembro).toHaveBeenCalledWith("fulano@x.com",
        expect.objectContaining({
          numero_oab: "263", uf_oab: "MG",
          importacao_automatica: true, subgrupos_destino: ["s1"],
        }))
    );
  });

  it("SEM inscrição o interruptor trava, e o texto é de TERCEIRO", async () => {
    /* ⚠️ "Cadastre a inscrição", não "Cadastre SUA inscrição": quem edita é
       outra pessoa. Mesma correção que as cinco mensagens do servidor. */
    renderComProviders(
      <EditarMembroForm membro={montarMembro()} grupos={grupos} podeMoverEntreGrupos
        onAtualizado={vi.fn()} onFechar={vi.fn()} />
    );

    const sw = await screen.findByRole("checkbox", { name: /Cadastrar automaticamente/ });
    expect(sw).toBeDisabled();
    expect(screen.getByText("Cadastre a inscrição acima para poder ligar.")).toBeInTheDocument();
    expect(screen.queryByText(/Cadastre sua inscrição/)).not.toBeInTheDocument();
  });

  it("🔴 sem poder mover de grupo, o campo Grupo fica travado", async () => {
    /* O `admin` não move ninguém entre grupos -- e `GET /grupos` é
       `super_admin`-only, então a lista chega vazia. Oferecer o próprio grupo
       como única opção diz ONDE a pessoa está; um select vazio não diria. */
    renderComProviders(
      <EditarMembroForm membro={montarMembro()} grupos={[]} podeMoverEntreGrupos={false}
        onAtualizado={vi.fn()} onFechar={vi.fn()} />
    );
    await screen.findByLabelText(/Número da OAB/);

    expect(screen.getByText("Meu grupo")).toBeInTheDocument();
  });

  it("🔴 sem poder mover de grupo, o seletor de papel NÃO oferece super admin", async () => {
    /* O servidor recusa "papel acima do seu" -- oferecer a opção seria
       convidar para um erro que ele já barra. */
    const user = userEvent.setup();
    renderComProviders(
      <EditarMembroForm membro={montarMembro()} grupos={[]} podeMoverEntreGrupos={false}
        onAtualizado={vi.fn()} onFechar={vi.fn()} />
    );
    await screen.findByLabelText(/Número da OAB/);

    await user.click(screen.getByLabelText("Papel"));

    expect(await screen.findByRole("option", { name: "Admin" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Super/i })).not.toBeInTheDocument();
  });
});

it("o 'i' do nome completo fala na TERCEIRA pessoa", async () => {
  /* 🔴 O texto do perfil diz "sua inscrição… que ela é sua". Aqui quem edita
     é outro, e repetir aquele texto poria o admin no lugar do titular.

     ⚠️ E o "i" importa MAIS aqui: o admin não sabe, ao digitar, que o nome vai
     ser conferido contra o tribunal -- sem ele a recusa chegaria sem aviso. */
  const user = userEvent.setup();
  renderComProviders(
    <EditarMembroForm membro={montarMembro()} grupos={grupos} podeMoverEntreGrupos
      onAtualizado={vi.fn()} onFechar={vi.fn()} />
  );
  await screen.findByLabelText(/Número da OAB/);

  await user.click(screen.getByRole("button", { name: /Por que o nome completo importa/ }));

  expect(await screen.findByText(/inscrição na OAB desta pessoa/)).toBeInTheDocument();
  expect(screen.queryByText(/que ela é sua/)).not.toBeInTheDocument();
});
