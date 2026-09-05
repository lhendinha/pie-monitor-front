import { Input, Textarea } from "@chakra-ui/react";
import { useState } from "react";

import {
  Campo,
  CampoDeClientes,
  CampoDeResponsaveis,
  LinhaDeCampos,
  Select,
  SeletorData,
} from "../../../../components";
import { useToastOnQueryError } from "../../../../services/queryClient";
import type { OpcaoProcesso } from "../../../../types";
import type { CamposOpcionaisProcesso } from "../../../../types";
import { useOpcoesDeProcesso } from "../../../../hooks/useOpcoesDeProcesso";

interface CamposProcessoProps {
  valores: CamposOpcionaisProcesso;
  onMudar: (valores: CamposOpcionaisProcesso) => void;
  /** Nome de cada id em `valores.clienteIds`, na MESMA ordem -- é o
   * `cliente_nomes` que a resposta do processo já traz.
   *
   * Prop separada, e não um campo de `CamposOpcionaisProcesso`, porque
   * aquele tipo é o CORPO da requisição de salvar: um nome ali seria
   * mandado de volta ao servidor como se fosse dado a gravar. Aqui ele só
   * serve pra etiqueta na tela de EDIÇÃO -- no cadastro não existe nada
   * escolhido ainda. */
  nomesDosClientes?: string[];
  /** De qual subgrupo saem as opções de responsável.
   *
   * 🔴 Vem de FORA porque este componente nunca soube o subgrupo, e as duas
   * telas o conhecem por caminhos diferentes: na edição ele vem do processo;
   * na criação, de um seletor que vive no `NovoProcessoForm` -- fora daqui.
   *
   * Sem ele o campo de responsável listaria as pessoas erradas, ou nenhuma. */
  subgrupoId: string;
  /** Apelido de cada e-mail em `valores.responsaveis`, na MESMA ordem. */
  nomesDosResponsaveis?: string[];
}

/** Campos opcionais compartilhados entre cadastro (`NovoProcessoForm`) e
 * edição (`ProcessoDetalhePage`) de processo.
 *
 * Chama `GET /fases` e `GET /situacoes` -- o cache do React Query evita
 * refetch duplicado mesmo montando em cadastro e edição, e compartilha com
 * os filtros de `ProcessosPage`.
 *
 * 🔴 Cliente NÃO vem mais por catálogo. Este componente monta DENTRO da
 * `ProcessosPage`, então abrir "Novo processo" baixava a lista inteira de
 * clientes uma segunda vez, na mesma tela. Agora é `CampoDeClientes`: nada é
 * pedido antes de a pessoa tocar no campo, e o que chega é a primeira página
 * em ordem alfabética.
 *
 * A ordem dos campos é a do artifact: identificação, partes, classificação
 * (fase/situação), prazos e por fim as anotações.
 */
export default function CamposProcesso({
  valores,
  onMudar,
  nomesDosClientes,
  subgrupoId,
  nomesDosResponsaveis,
}: CamposProcessoProps) {
  /* Semeado uma vez, na montagem: depois quem manda é o próprio campo. Os
     dois arrays vêm pareados por índice do servidor (`cliente_nomes` cai pro
     próprio id quando o cliente sumiu), então o `??` só cobre o caso de a
     prop não ter sido passada -- o cadastro, onde não há nada escolhido. */
  const [nomes, setNomes] = useState<Map<string, string>>(
    () =>
      new Map((valores.clienteIds || []).map((id, i) => [id, nomesDosClientes?.[i] ?? id])),
  );

  const fasesQuery = useOpcoesDeProcesso("fase");
  useToastOnQueryError(fasesQuery.error, "Não foi possível carregar as fases.");
  const fases = fasesQuery.data || [];

  const situacoesQuery = useOpcoesDeProcesso("situacao");
  useToastOnQueryError(situacoesQuery.error, "Não foi possível carregar as situações.");
  const situacoes = situacoesQuery.data || [];

  /** O dropdown só oferece as ativas como escolha nova, mas preserva o valor
   * atual mesmo se ele apontar pra uma opção já desativada. O "Nenhuma"
   * explícito existe porque os dois campos são opcionais e o `Select` não é
   * clearable. */
  function opcoesComVazio(todas: OpcaoProcesso[], selecionadoId: string) {
    const ativas = todas
      .filter((o) => o.ativo || o.opcao_id === selecionadoId)
      .map((o) => ({ value: o.opcao_id, label: o.rotulo }));
    return [{ value: "", label: "Nenhuma" }, ...ativas];
  }

  function mudarCampo<K extends keyof CamposOpcionaisProcesso>(
    campo: K,
    valor: CamposOpcionaisProcesso[K],
  ) {
    onMudar({ ...valores, [campo]: valor });
  }

  return (
    <>
      <Campo rotulo="Clientes" para="cliente-processo">
        <CampoDeClientes
          id="cliente-processo"
          valor={valores.clienteIds || []}
          nomes={nomes}
          onMudar={(ids, novosNomes) => {
            setNomes(novosNomes);
            mudarCampo("clienteIds", ids);
          }}
        />
      </Campo>

      <Campo rotulo="Responsáveis" para="responsaveis-processo">
        <CampoDeResponsaveis
          id="responsaveis-processo"
          subgrupoId={subgrupoId}
          valor={valores.responsaveis || []}
          nomes={nomesDosResponsaveis}
          onMudar={(emails) => mudarCampo("responsaveis", emails)}
        />
      </Campo>

      <Campo rotulo="Objeto / assunto" para="objeto-assunto-processo">
        <Input
          id="objeto-assunto-processo"
          value={valores.objetoAssunto || ""}
          onChange={(e) => mudarCampo("objetoAssunto", e.target.value)}
          placeholder="Ex: Cobrança de honorários"
        />
      </Campo>

      <LinhaDeCampos>
        <Campo rotulo="Fase" para="fase-processo">
          <Select
            id="fase-processo"
            opcoes={opcoesComVazio(fases, valores.faseId || "")}
            valor={valores.faseId || ""}
            onMudar={(v) => mudarCampo("faseId", v)}
            /* Sem isto o campo oferecia só "Nenhuma" enquanto a lista vinha
               -- uma resposta errada, não uma lista incompleta. Numa
               EDIÇÃO era pior: a fase já gravada só reaparecia depois. */
            carregando={fasesQuery.isPending}
          />
        </Campo>
        <Campo rotulo="Situação" para="situacao-processo">
          <Select
            id="situacao-processo"
            opcoes={opcoesComVazio(situacoes, valores.situacaoId || "")}
            valor={valores.situacaoId || ""}
            onMudar={(v) => mudarCampo("situacaoId", v)}
            carregando={situacoesQuery.isPending}
          />
        </Campo>
      </LinhaDeCampos>

      <LinhaDeCampos>
        <Campo rotulo="Data para verificar" para="data-verificar-processo">
          <SeletorData
            id="data-verificar-processo"
            rotuladoPor="data-verificar-processo-rotulo"
            valor={valores.dataVerificar || ""}
            onMudar={(v) => mudarCampo("dataVerificar", v)}
            placeholder="Selecionar"
          />
        </Campo>
        <Campo rotulo="Prazo final" para="prazo-final-processo">
          <SeletorData
            id="prazo-final-processo"
            rotuladoPor="prazo-final-processo-rotulo"
            valor={valores.prazoFinal || ""}
            onMudar={(v) => mudarCampo("prazoFinal", v)}
            placeholder="Selecionar"
          />
        </Campo>
      </LinhaDeCampos>

      <Campo rotulo="Próxima providência" para="proxima-providencia-processo">
        <Input
          id="proxima-providencia-processo"
          value={valores.proximaProvidencia || ""}
          onChange={(e) => mudarCampo("proximaProvidencia", e.target.value)}
          placeholder="Ex: Protocolar réplica"
        />
      </Campo>

      <Campo rotulo="Observações" para="observacoes-processo">
        <Textarea
          id="observacoes-processo"
          value={valores.observacoes || ""}
          onChange={(e) => mudarCampo("observacoes", e.target.value)}
          placeholder="Anotações internas sobre o processo"
        />
      </Campo>
    </>
  );
}
