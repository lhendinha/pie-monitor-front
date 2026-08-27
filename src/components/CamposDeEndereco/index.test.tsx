import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ consultarCep: vi.fn() }));
vi.mock("../../services", () => mocks);

import { ApiError } from "../../services/api/client";
import CamposDeEndereco from "./index";
import type { EnderecoDoCliente } from "../../types";
import { renderComProviders } from "../../test/queryTestUtils";

const VAZIO: EnderecoDoCliente = {
  cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "",
};

const ACHADO = {
  cep: "30130010",
  logradouro: "Praça Sete de Setembro",
  bairro: "Centro",
  cidade: "Belo Horizonte",
  uf: "MG",
};

/** Envolve o componente num estado de verdade -- ele é controlado, e um
 * `onMudar` de mentira não deixaria o valor voltar pro campo. */
function Anfitriao({ inicial = VAZIO }: { inicial?: EnderecoDoCliente }) {
  const [valores, setValores] = useState(inicial);
  return <CamposDeEndereco valores={valores} onMudar={setValores} />;
}

function montar(inicial?: EnderecoDoCliente) {
  return renderComProviders(<Anfitriao inicial={inicial} />);
}

const cep = () => screen.getByLabelText(/CEP/);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.consultarCep.mockResolvedValue(ACHADO);
});

describe("CamposDeEndereco", () => {
  it("mostra os sete campos", async () => {
    montar();

    for (const rotulo of [/CEP/, /Logradouro/, /Número/, /Complemento/, /Bairro/, /Cidade/, /UF/]) {
      expect(screen.getByLabelText(rotulo)).toBeInTheDocument();
    }
  });

  it("mascara o CEP enquanto a pessoa digita", async () => {
    const user = userEvent.setup();
    montar();

    await user.type(cep(), "30130010");

    expect(cep()).toHaveValue("30130-010");
  });

  it("🔴 NÃO consulta com 7 dígitos -- é a guarda que substitui o debounce", async () => {
    /* Quem digita "30130010" passa por sete valores incompletos. Sem esta
       guarda seriam sete consultas; com ela, nenhuma até o oitavo dígito --
       e por isso não há timer nenhum aqui. */
    const user = userEvent.setup();
    montar();

    await user.type(cep(), "3013001");

    expect(mocks.consultarCep).not.toHaveBeenCalled();
  });

  it("consulta no OITAVO dígito, e só com os dígitos", async () => {
    const user = userEvent.setup();
    montar();

    await user.type(cep(), "30130010");

    await waitFor(() => expect(mocks.consultarCep).toHaveBeenCalledWith("30130010"));
    expect(mocks.consultarCep).toHaveBeenCalledTimes(1);
  });

  it("preenche logradouro, bairro, cidade e UF com o que veio", async () => {
    const user = userEvent.setup();
    montar();

    await user.type(cep(), "30130010");

    await waitFor(() => expect(screen.getByLabelText(/Logradouro/)).toHaveValue("Praça Sete de Setembro"));
    expect(screen.getByLabelText(/Bairro/)).toHaveValue("Centro");
    expect(screen.getByLabelText(/Cidade/)).toHaveValue("Belo Horizonte");
  });

  it("🔴 o foco vai pro Número -- o campo que a consulta não traz", async () => {
    const user = userEvent.setup();
    montar();

    await user.type(cep(), "30130010");

    await waitFor(() => expect(screen.getByLabelText(/Número/)).toHaveFocus());
  });

  it("🔴 NÃO preenche o Complemento -- lá é faixa de numeração, não endereço", async () => {
    /* O `complemento` do provedor é "até 99999999 - lado ímpar". A API já o
       descarta; este teste é a guarda do lado de cá, pra ninguém "corrigir"
       aquilo achando que faltou um campo. */
    const user = userEvent.setup();
    montar();

    await user.type(screen.getByLabelText(/Complemento/), "Sala 302");
    await user.type(cep(), "30130010");

    await waitFor(() => expect(screen.getByLabelText(/Cidade/)).toHaveValue("Belo Horizonte"));
    expect(screen.getByLabelText(/Complemento/)).toHaveValue("Sala 302");
  });

  it("🔴 o que a pessoa digitou no Número sobrevive à consulta", async () => {
    const user = userEvent.setup();
    montar();

    await user.type(screen.getByLabelText(/Número/), "1200");
    await user.type(cep(), "30130010");

    await waitFor(() => expect(screen.getByLabelText(/Cidade/)).toHaveValue("Belo Horizonte"));
    expect(screen.getByLabelText(/Número/)).toHaveValue("1200");
  });

  it("nenhum campo fica travado depois da consulta -- endereço vem errado às vezes", async () => {
    const user = userEvent.setup();
    montar();

    await user.type(cep(), "30130010");
    await waitFor(() => expect(screen.getByLabelText(/Logradouro/)).toHaveValue("Praça Sete de Setembro"));

    await user.clear(screen.getByLabelText(/Logradouro/));
    await user.type(screen.getByLabelText(/Logradouro/), "Praça Sete");

    expect(screen.getByLabelText(/Logradouro/)).toHaveValue("Praça Sete");
  });

  it("não repete a consulta do mesmo CEP", async () => {
    const user = userEvent.setup();
    montar();

    await user.type(cep(), "30130010");
    await waitFor(() => expect(mocks.consultarCep).toHaveBeenCalledTimes(1));

    // Apagar um dígito e redigitá-lo dá o mesmo CEP -- e sobrescreveria o
    // que a pessoa tivesse corrigido à mão no logradouro.
    await user.type(cep(), "{backspace}0");

    await waitFor(() => expect(mocks.consultarCep).toHaveBeenCalledTimes(1));
  });

  it("CEP trocado consulta de novo", async () => {
    const user = userEvent.setup();
    montar();

    await user.type(cep(), "30130010");
    await waitFor(() => expect(mocks.consultarCep).toHaveBeenCalledTimes(1));

    await user.clear(cep());
    await user.type(cep(), "01001000");

    await waitFor(() => expect(mocks.consultarCep).toHaveBeenCalledTimes(2));
  });

  describe("quando a consulta não dá certo", () => {
    it("🔴 404 diz pra preencher à mão -- é caminho normal", async () => {
      mocks.consultarCep.mockRejectedValue(new ApiError("não achou", 404));
      const user = userEvent.setup();
      montar();

      await user.type(cep(), "12345678");

      expect(await screen.findByText(/CEP não encontrado/)).toBeInTheDocument();
    });

    it("🔴 502 diz pra TENTAR DE NOVO -- é transitório, e a mensagem não pode ser a mesma", async () => {
      /* Trocar as duas desorienta: mandar "tente de novo" pra um CEP que
         não existe empurra pra uma repetição que vai falhar igual, e mandar
         "preencha à mão" quando o serviço caiu esconde que era passageiro. */
      mocks.consultarCep.mockRejectedValue(new ApiError("fora", 502));
      const user = userEvent.setup();
      montar();

      await user.type(cep(), "30130010");

      expect(await screen.findByText(/Tente de novo/)).toBeInTheDocument();
      expect(screen.queryByText(/CEP não encontrado/)).not.toBeInTheDocument();
    });

    it("🔴 depois de falhar, redigitar o MESMO CEP tenta de novo", async () => {
      /* A mensagem diz "tente de novo" -- e sem isto ela seria mentira: com
         a memória do último consultado intacta, redigitar o mesmo CEP não
         dispararia nada, e não haveria como tentar. */
      mocks.consultarCep.mockRejectedValueOnce(new ApiError("fora", 502));
      const user = userEvent.setup();
      montar();

      await user.type(cep(), "30130010");
      expect(await screen.findByText(/Tente de novo/)).toBeInTheDocument();

      await user.type(cep(), "{backspace}0");

      await waitFor(() => expect(mocks.consultarCep).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(screen.getByLabelText(/Cidade/)).toHaveValue("Belo Horizonte"));
    });

    it("o erro não apaga o que a pessoa já tinha digitado", async () => {
      mocks.consultarCep.mockRejectedValue(new ApiError("não achou", 404));
      const user = userEvent.setup();
      montar();

      await user.type(screen.getByLabelText(/Cidade/), "Contagem");
      await user.type(cep(), "12345678");

      expect(await screen.findByText(/CEP não encontrado/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Cidade/)).toHaveValue("Contagem");
    });
  });

  it("abre com o endereço que já estava gravado", () => {
    montar({ ...VAZIO, cep: "30130-010", cidade: "Belo Horizonte", uf: "MG" });

    expect(cep()).toHaveValue("30130-010");
    expect(screen.getByLabelText(/Cidade/)).toHaveValue("Belo Horizonte");
  });
});
