import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { renderComProviders } from "../test/queryTestUtils";
import { useGuardaDeDescarte } from "./useGuardaDeDescarte";

/** Arnês: um formulário mínimo com os dois formatos que importam -- um texto e
 * uma lista -- mais os botões que simulam o que o sistema faz sozinho. */
function Harness({
  nomeInicial = "",
  tagsIniciais = [],
  pronto,
}: {
  nomeInicial?: string;
  tagsIniciais?: string[];
  pronto?: boolean;
}) {
  const [nome, setNome] = useState(nomeInicial);
  const [tags, setTags] = useState<string[]>(tagsIniciais);
  const { mudou, resemear, refazerRetrato } = useGuardaDeDescarte({ nome, tags }, { pronto });

  return (
    <div>
      <label htmlFor="nome">Nome</label>
      <input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
      <p data-testid="mudou">{mudou ? "mudou" : "intacto"}</p>

      {/* O que a REDE faz: grava e avisa o retrato, com os mesmos literais. */}
      <button
        type="button"
        onClick={() => {
          setNome("veio do servidor");
          resemear("perfil", { nome: "veio do servidor" });
        }}
      >
        semear perfil
      </button>
      {/* O REFETCH: a mesma semeadura rodando de novo, com dado novo do
          servidor, sem tocar no campo. Separar as duas coisas é de propósito
          -- sobrescrever o que a pessoa digitou é defeito do FORMULÁRIO
          (campo que devia estar desabilitado enquanto carrega), e o que se
          mede aqui é só se o RETRATO se mexe. */}
      <button
        type="button"
        onClick={() => resemear("perfil", { nome: "outro valor do servidor" })}
      >
        refetch
      </button>
      {/* Uma segunda semeadura, independente da primeira. */}
      <button
        type="button"
        onClick={() => {
          setTags(["civel"]);
          resemear("tags", { tags: ["civel"] });
        }}
      >
        semear tags
      </button>
      {/* O que a PESSOA faz: muda a lista, e isto tem de sujar. */}
      <button type="button" onClick={() => setTags(["trabalhista"])}>
        escolher tag
      </button>
      <button type="button" onClick={refazerRetrato}>
        refazer retrato
      </button>
    </div>
  );
}

const estado = () => screen.getByTestId("mudou").textContent;
const campo = () => screen.getByLabelText("Nome");

describe("useGuardaDeDescarte", () => {
  it("🔴 nasce INTACTO mesmo com o formulário pré-populado", async () => {
    /* O caso que o requisito pediu por último e que muda tudo: a tarefa que
       abre já com coluna, data e processo não é trabalho da pessoa -- é
       contexto que o sistema pôs ali. Perguntar seria falso positivo no gesto
       mais comum de todos: abrir sem querer e fechar. */
    renderComProviders(<Harness nomeInicial="Caso Alfa" tagsIniciais={["civel"]} />);

    expect(estado()).toBe("intacto");
  });

  it("digitar muda", async () => {
    const usuario = userEvent.setup();
    renderComProviders(<Harness />);

    await usuario.type(campo(), "a");

    expect(estado()).toBe("mudou");
  });

  it("🔴 digitar e DESFAZER volta a intacto", async () => {
    /* O par negativo que sustenta a fase inteira: sem ele, uma implementação
       que só marcasse "houve interação" -- e nunca mais desmarcasse -- passaria
       no teste acima. Quem digitou por engano e apagou não pode ser
       interrogado ao sair. */
    const usuario = userEvent.setup();
    renderComProviders(<Harness nomeInicial="Alfa" />);

    await usuario.type(campo(), "X");
    expect(estado()).toBe("mudou");

    await usuario.type(campo(), "{Backspace}");

    expect(estado()).toBe("intacto");
  });

  it("lista muda quando a pessoa escolhe", async () => {
    const usuario = userEvent.setup();
    renderComProviders(<Harness tagsIniciais={["civel"]} />);

    await usuario.click(screen.getByRole("button", { name: "escolher tag" }));

    expect(estado()).toBe("mudou");
  });

  // ── a semeadura, que é o motivo de o hook não ser um `useState` simples ──

  it("semeadura pela REDE não conta como mudança", async () => {
    const usuario = userEvent.setup();
    renderComProviders(<Harness />);

    await usuario.click(screen.getByRole("button", { name: "semear perfil" }));

    expect(estado()).toBe("intacto");
  });

  it("e editar POR CIMA da semeadura conta", async () => {
    /* O par negativo da semeadura: sem ele, um `resemear` que congelasse o
       retrato para sempre também passaria no teste acima. */
    const usuario = userEvent.setup();
    renderComProviders(<Harness />);

    await usuario.click(screen.getByRole("button", { name: "semear perfil" }));
    await usuario.type(campo(), "!");

    expect(estado()).toBe("mudou");
  });

  it("🔴 a MESMA chave semeia UMA vez -- o refetch não move o retrato", async () => {
    /* O defeito que isto impede: `staleTime: 0` sem `refetchOnWindowFocus`
       desligado, então basta voltar para a aba para a semeadura rodar de novo.
       Sem a dedução por chave, o retrato passaria a ser o dado NOVO do
       servidor -- e o formulário, que ninguém tocou, apareceria alterado.

       ⚠️ O escopo desta garantia é só o RETRATO. Se o refetch sobrescrever o
       que a pessoa digitou, o texto já se perdeu antes de a guarda opinar --
       aquilo é defeito do formulário, e se resolve desabilitando o campo
       enquanto a consulta corre. */
    const usuario = userEvent.setup();
    renderComProviders(<Harness />);

    await usuario.click(screen.getByRole("button", { name: "semear perfil" }));
    expect(estado()).toBe("intacto");

    await usuario.click(screen.getByRole("button", { name: "refetch" }));

    expect(estado()).toBe("intacto");
  });

  it("duas semeaduras INDEPENDENTES não se atrapalham", async () => {
    /* Por isso a dedução é por chave e não um sinal único: o
       `EditarMembroForm` tem duas semeaduras separadas, e um sinal só deixaria
       a segunda calada -- ela contaria como mudança da pessoa. */
    const usuario = userEvent.setup();
    renderComProviders(<Harness />);

    await usuario.click(screen.getByRole("button", { name: "semear perfil" }));
    await usuario.click(screen.getByRole("button", { name: "semear tags" }));

    expect(estado()).toBe("intacto");
  });

  // ── as duas saídas de emergência ────────────────────────────────────────

  it("`pronto: false` segura a resposta mesmo com o campo mexido", async () => {
    const usuario = userEvent.setup();
    renderComProviders(<Harness pronto={false} />);

    await usuario.type(campo(), "a");

    expect(estado()).toBe("intacto");
  });

  it("`refazerRetrato` adota o que está na tela como novo marco zero", async () => {
    /* Para o modal que salva e CONTINUA aberto: depois de gravar, o que está
       na tela É o salvo, e perguntar sobre ele seria mentira. */
    const usuario = userEvent.setup();
    renderComProviders(<Harness />);

    await usuario.type(campo(), "algo");
    expect(estado()).toBe("mudou");

    await usuario.click(screen.getByRole("button", { name: "refazer retrato" }));

    expect(estado()).toBe("intacto");
  });
});
