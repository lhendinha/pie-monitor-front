import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";
import { TAMANHO_MAXIMO_DE_ARQUIVO } from "../../constants/documento";
import CampoDeArquivo from "./index";

/** Um `File` de tamanho arbitrário sem alocar os bytes.
 *
 * 🔴 `new File([bytes], ...)` com 21 MB de conteúdo alocaria 21 MB por teste
 * -- e o que se testa aqui é a DECISÃO sobre `size`, não a leitura do
 * conteúdo. `size` é somente-leitura, então a redefinição é a única forma de
 * afirmar a recusa sem pagar a memória.
 */
function arquivoDe(nome: string, bytes: number): File {
  const arquivo = new File(["x"], nome, { type: "application/pdf" });
  Object.defineProperty(arquivo, "size", { value: bytes });
  return arquivo;
}

/** O campo é controlado, então o teste precisa segurar o valor -- montá-lo
 * com `valor={null}` fixo faria o escolhido nunca aparecer, e o teste
 * passaria a afirmar o contrário do que a tela faz. */
function Hospedeiro({ onMudar }: { onMudar?: (a: File | null) => void }) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  return (
    <CampoDeArquivo
      id="arquivo"
      valor={arquivo}
      onMudar={(a) => {
        setArquivo(a);
        onMudar?.(a);
      }}
    />
  );
}

const entrada = () => screen.getByLabelText<HTMLInputElement>(/escolher ou arraste/i);

describe("escolher", () => {
  it("mostra o nome e o tamanho do escolhido", async () => {
    renderComProviders(<Hospedeiro />);

    await userEvent.upload(entrada(), arquivoDe("peticao.pdf", 1536));

    expect(screen.getByText("peticao.pdf")).toBeInTheDocument();
    // 1536 bytes = 1,5 KB. Base 1024, como o teto e como o sistema
    // operacional onde a pessoa vai conferir o arquivo baixado.
    expect(screen.getByText("2 KB")).toBeInTheDocument();
  });
});

describe("recusa local", () => {
  it("🔴 recusa acima do teto SEM avisar quem monta o campo", async () => {
    /* A recusa que vale é a do armazenamento -- esta existe pra não fazer a
       pessoa esperar minutos de upload por uma negativa que já dava pra dar
       na hora. Por isso ela não pode chamar `onMudar`: se chamasse, o modal
       montaria o envio de um arquivo que ele mesmo acabou de recusar. */
    const onMudar = vi.fn();
    renderComProviders(<Hospedeiro onMudar={onMudar} />);

    await userEvent.upload(
      entrada(),
      arquivoDe("enorme.pdf", TAMANHO_MAXIMO_DE_ARQUIVO + 1),
    );

    expect(onMudar).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/O limite é 20,0 MB/);
    // E o campo continua oferecendo escolher: recusar não é travar.
    expect(entrada()).toBeInTheDocument();
  });

  it("🔴 recusa arquivo de ZERO byte", async () => {
    /* Sem isto ele viraria um documento que baixa em branco, sem erro em
       lugar nenhum -- a política do envio começa em 1 byte justamente por
       isso, e a tela não pode oferecer o que o servidor vai negar. */
    const onMudar = vi.fn();
    renderComProviders(<Hospedeiro onMudar={onMudar} />);

    await userEvent.upload(entrada(), arquivoDe("vazio.pdf", 0));

    expect(onMudar).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/vazio/i);
  });

  it("aceita exatamente o teto -- a régua é 'acima de', não 'a partir de'", async () => {
    const onMudar = vi.fn();
    renderComProviders(<Hospedeiro onMudar={onMudar} />);

    await userEvent.upload(entrada(), arquivoDe("no-limite.pdf", TAMANHO_MAXIMO_DE_ARQUIVO));

    expect(onMudar).toHaveBeenCalledOnce();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("remover", () => {
  it("🔴 deixa escolher o MESMO arquivo de novo depois de removê-lo", async () => {
    /* O navegador compara `input.value` com o anterior e não dispara
       `change` quando são iguais -- sem zerar o `value` na remoção, o campo
       ficava mudo justamente na correção mais provável (remover por engano e
       recolocar), e parecia defeito do arquivo. */
    renderComProviders(<Hospedeiro />);
    const arquivo = arquivoDe("procuracao.pdf", 2048);

    await userEvent.upload(entrada(), arquivo);
    await userEvent.click(screen.getByRole("button", { name: /Remover procuracao.pdf/ }));
    expect(screen.queryByText("procuracao.pdf")).not.toBeInTheDocument();

    await userEvent.upload(entrada(), arquivo);
    expect(screen.getByText("procuracao.pdf")).toBeInTheDocument();
  });
});
