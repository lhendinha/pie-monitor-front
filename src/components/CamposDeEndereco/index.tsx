import { Input } from "@chakra-ui/react";
import { useRef } from "react";

import Campo from "../Campo";
import LinhaDeCampos from "../LinhaDeCampos";
import RotuloDeSecao from "../RotuloDeSecao";
import { Select } from "../Select";
import { UFS } from "../../constants";
import { useCep } from "../../hooks/useCep";
import { mascararCep } from "../../utils";
import type { EnderecoDoCliente } from "../../types";

interface CamposDeEnderecoProps {
  valores: EnderecoDoCliente;
  onMudar: (valores: EnderecoDoCliente) => void;
  /** Sufixo dos `id` dos campos. As duas telas de cliente nunca coexistem
   * (`/clientes` e `/clientes/:id` são rotas distintas), então isto não é
   * defesa contra colisão -- é só o que mantém os ids legíveis e iguais aos
   * dos campos vizinhos, que já usam `-edicao` numa e nada na outra. */
  sufixoDoId?: string;
  /** Trava tudo, sem esconder: quem não pode gravar ainda precisa LER o
   * endereço, e a consulta de CEP é `manager`+ de qualquer forma. */
  somenteLeitura?: boolean;
}

/** O bloco "Endereço" das duas telas de cliente -- cadastro e edição.
 *
 * Compartilhado porque são sete campos: duas cópias divergem no primeiro
 * ajuste. Segue a forma de `CamposProcesso` (objeto de valores +
 * `mudarCampo` tipado), mas mora em `components/` e não dentro de uma
 * página, porque quem o usa são DUAS páginas -- `CamposProcesso` vive em
 * `ProcessosPage` e é importado por `ProcessoDetalhePage`, o que já é uma
 * exceção à regra e não vale repetir.
 *
 * ⚠️ Nenhum campo fica travado depois da consulta: endereço que o provedor
 * erra existe (imóvel novo, loteamento recente), e a pessoa precisa poder
 * corrigir o que veio.
 */
export default function CamposDeEndereco({
  valores,
  onMudar,
  sufixoDoId = "",
  somenteLeitura = false,
}: CamposDeEnderecoProps) {
  const refDoNumero = useRef<HTMLInputElement>(null);

  function mudarCampo<K extends keyof EnderecoDoCliente>(campo: K, valor: EnderecoDoCliente[K]) {
    onMudar({ ...valores, [campo]: valor });
  }

  const { estado, aoMudarCep } = useCep({
    aoPreencher: (achado) => {
      /* Um `onMudar` só com tudo junto: quatro chamadas seguidas partiriam
         do mesmo `valores` capturado e só a última sobreviveria -- o
         clássico de atualizar estado derivado em sequência. */
      onMudar({
        ...valores,
        cep: mascararCep(achado.cep),
        logradouro: achado.logradouro,
        bairro: achado.bairro,
        cidade: achado.cidade,
        uf: achado.uf,
      });
      /* ⚠️ O foco vai pro Número: é o campo que a consulta não traz E que
         quase todo endereço tem. O Complemento também não vem, mas a
         maioria dos endereços não usa -- mandar o foco pra lá faria a
         pessoa passar por um campo que ela ia deixar vazio. */
      refDoNumero.current?.focus();
    },
  });

  const id = (nome: string) => `${nome}-cliente${sufixoDoId}`;

  return (
    <>
      {/* 🔴 Sem "(opcional)" -- nem aqui, nem nos sete rótulos. O padrão do
          app é asterisco vermelho no obrigatório e NADA no resto, e o bloco
          é opcional inteiro.

          ⚠️ Até 01/09/2026 o título dizia "Endereço (opcional)", e a razão
          era COMPARATIVA: os campos de contato do cliente diziam "(opcional)"
          um por um, então um bloco calado ao lado deles lia como obrigatório.
          Esses "(opcional)" saíram no mesmo commit, e a comparação que
          sustentava a exceção deixou de existir. */}
      <RotuloDeSecao>Endereço</RotuloDeSecao>

      <LinhaDeCampos>
        <Campo
          rotulo="CEP"
          para={id("cep")}
          dica={estado.buscando ? "Buscando endereço…" : undefined}
          erro={estado.aviso}
        >
          <Input
            id={id("cep")}
            value={valores.cep}
            onChange={(e) => {
              const mascarado = mascararCep(e.target.value);
              mudarCampo("cep", mascarado);
              if (!somenteLeitura) void aoMudarCep(mascarado);
            }}
            inputMode="numeric"
            placeholder="00000-000"
            readOnly={somenteLeitura}
          />
        </Campo>

        <Campo rotulo="Logradouro" para={id("logradouro")}>
          <Input
            id={id("logradouro")}
            value={valores.logradouro}
            onChange={(e) => mudarCampo("logradouro", e.target.value)}
            readOnly={somenteLeitura}
          />
        </Campo>
      </LinhaDeCampos>

      <LinhaDeCampos>
        <Campo rotulo="Número" para={id("numero")}>
          <Input
            id={id("numero")}
            ref={refDoNumero}
            value={valores.numero}
            onChange={(e) => mudarCampo("numero", e.target.value)}
            /* Sem `inputMode="numeric"`: "S/N", "123-A" e "km 12" são
               endereços reais, e um teclado só de dígitos os impediria. */
            placeholder="S/N"
            readOnly={somenteLeitura}
          />
        </Campo>

        <Campo rotulo="Complemento" para={id("complemento")}>
          <Input
            id={id("complemento")}
            value={valores.complemento}
            onChange={(e) => mudarCampo("complemento", e.target.value)}
            placeholder="Sala, bloco, andar…"
            readOnly={somenteLeitura}
          />
        </Campo>
      </LinhaDeCampos>

      <LinhaDeCampos>
        <Campo rotulo="Bairro" para={id("bairro")}>
          <Input
            id={id("bairro")}
            value={valores.bairro}
            onChange={(e) => mudarCampo("bairro", e.target.value)}
            readOnly={somenteLeitura}
          />
        </Campo>

        <Campo rotulo="Cidade" para={id("cidade")}>
          <Input
            id={id("cidade")}
            value={valores.cidade}
            onChange={(e) => mudarCampo("cidade", e.target.value)}
            readOnly={somenteLeitura}
          />
        </Campo>
      </LinhaDeCampos>

      <Campo rotulo="UF" para={id("uf")}>
        <Select
          id={id("uf")}
          /* 🔴 A opção vazia é EXPLÍCITA: o `Select` não é clearable, e sem
             ela quem escolhesse uma UF nunca mais voltaria ao vazio -- um
             estado que a API aceita e a tela não alcançaria. Mesmo arranjo
             de Fase e Situação em `CamposProcesso`. */
          opcoes={[{ value: "", label: "Nenhuma" }, ...UFS.map((uf) => ({ value: uf, label: uf }))]}
          valor={valores.uf}
          onMudar={(v) => mudarCampo("uf", v)}
          desabilitado={somenteLeitura}
          largura="120px"
        />
      </Campo>
    </>
  );
}
