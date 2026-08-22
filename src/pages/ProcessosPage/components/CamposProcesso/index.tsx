import { Input, Textarea } from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";

import {
  Campo,
  LinhaDeCampos,
  MultiSelect,
  Select,
  SeletorData,
} from "../../../../components";
import { TAMANHO_PAGINA_PICKER } from "../../../../constants";
import { listarClientes, listarOpcoesProcesso } from "../../../../services";
import { useToastOnQueryError } from "../../../../services/queryClient";
import { qk } from "../../../../services/queryKeys";
import type { Cliente, OpcaoProcesso } from "../../../../types";
import type { CamposOpcionaisProcesso } from "../../../../services/api/processos";

interface Props {
  valores: CamposOpcionaisProcesso;
  onMudar: (valores: CamposOpcionaisProcesso) => void;
}

/** Campos opcionais compartilhados entre cadastro (`NovoProcessoForm`) e
 * edição (`ProcessoDetalhePage`) de processo.
 *
 * É quem chama `GET /clientes`/`/fases`/`/situacoes` -- o cache do React
 * Query evita refetch duplicado mesmo montando em cadastro e edição, e
 * também compartilha com os filtros de `ProcessosPage`, que pedem o mesmo
 * `TAMANHO_PAGINA_PICKER`.
 *
 * A ordem dos campos é a do artifact: identificação, partes, classificação
 * (fase/situação), prazos e por fim as anotações.
 */
export default function CamposProcesso({ valores, onMudar }: Props) {
  const clientesQuery = useQuery<{ clientes: Cliente[] }>({
    queryKey: qk.clientes({ tamanhoPagina: TAMANHO_PAGINA_PICKER }),
    queryFn: () => listarClientes({ tamanhoPagina: TAMANHO_PAGINA_PICKER }),
  });
  useToastOnQueryError(clientesQuery.error, "Não foi possível carregar os clientes.");
  const clientes = clientesQuery.data?.clientes || [];

  const fasesQuery = useQuery<{ opcoes: OpcaoProcesso[] }>({
    queryKey: qk.opcoesProcesso("fase", { tamanhoPagina: TAMANHO_PAGINA_PICKER }),
    queryFn: () => listarOpcoesProcesso("fase", { tamanhoPagina: TAMANHO_PAGINA_PICKER }),
  });
  useToastOnQueryError(fasesQuery.error, "Não foi possível carregar as fases.");
  const fases = fasesQuery.data?.opcoes || [];

  const situacoesQuery = useQuery<{ opcoes: OpcaoProcesso[] }>({
    queryKey: qk.opcoesProcesso("situacao", { tamanhoPagina: TAMANHO_PAGINA_PICKER }),
    queryFn: () => listarOpcoesProcesso("situacao", { tamanhoPagina: TAMANHO_PAGINA_PICKER }),
  });
  useToastOnQueryError(situacoesQuery.error, "Não foi possível carregar as situações.");
  const situacoes = situacoesQuery.data?.opcoes || [];

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
        <MultiSelect
          id="cliente-processo"
          opcoes={clientes.map((c) => ({ value: c.cliente_id, label: c.nome }))}
          selecionados={valores.clienteIds || []}
          onMudar={(v) => mudarCampo("clienteIds", v)}
          placeholder="Selecione os clientes"
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
          />
        </Campo>
        <Campo rotulo="Situação" para="situacao-processo">
          <Select
            id="situacao-processo"
            opcoes={opcoesComVazio(situacoes, valores.situacaoId || "")}
            valor={valores.situacaoId || ""}
            onMudar={(v) => mudarCampo("situacaoId", v)}
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
