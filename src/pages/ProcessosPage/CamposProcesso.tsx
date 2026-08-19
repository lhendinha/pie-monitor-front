import { useQuery } from "@tanstack/react-query";
import { listarClientes, listarOpcoesProcesso } from "../../services";
import { useToastOnQueryError } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import { Select, MultiSelect } from "../../components";
import type { Cliente, OpcaoProcesso } from "../../types";
import type { CamposOpcionaisProcesso } from "../../services/api/processos";

interface CamposProcessoProps {
  valores: CamposOpcionaisProcesso;
  onMudar: (valores: CamposOpcionaisProcesso) => void;
}

/** Campos opcionais compartilhados entre cadastro (NovoProcessoForm) e
 * edição (DetalheEditarProcesso) de processo -- essa é quem chama
 * `GET /clientes`/`/fases`/`/situacoes` (cache do React Query evita refetch
 * duplicado mesmo montando em cadastro e edição). */
// GET /clientes, /fases, /situacoes são paginados de verdade (10 por
// página por padrão) -- pra popular o dropdown/multi-select inteiro aqui,
// pede o teto de tamanho já usado pelo resto do app (100) em vez de
// paginar de verdade. Grupos com >100 clientes/opções precisariam de
// busca-conforme-digita no picker, não implementado ainda (não é o caso
// hoje em nenhum grupo real).
const TAMANHO_PAGINA_PICKER = 100;

export default function CamposProcesso({ valores, onMudar }: CamposProcessoProps) {
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

  // Dropdown só oferece as ativas como escolha nova, mas preserva o valor
  // atual mesmo se ele apontar pra uma opção já desativada -- inclui um
  // "Nenhuma" explícito porque os dois campos são opcionais (o <Select>
  // base não é clearable, então precisa de uma opção própria pra "vazio").
  function opcoesComVazio(todas: OpcaoProcesso[], selecionadoId: string) {
    const ativas = todas
      .filter((o) => o.ativo || o.opcao_id === selecionadoId)
      .map((o) => ({ value: o.opcao_id, label: o.rotulo }));
    return [{ value: "", label: "Nenhuma" }, ...ativas];
  }

  function mudarCampo<K extends keyof CamposOpcionaisProcesso>(campo: K, valor: CamposOpcionaisProcesso[K]) {
    onMudar({ ...valores, [campo]: valor });
  }

  return (
    <>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="cliente-processo">Cliente</label>
        <MultiSelect
          id="cliente-processo"
          opcoes={clientes.map((c) => ({ value: c.cliente_id, label: c.nome }))}
          selecionados={valores.clienteIds || []}
          onMudar={(v) => mudarCampo("clienteIds", v)}
          placeholder="Selecione os clientes"
        />
      </div>

      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="objeto-assunto-processo">Objeto/Assunto</label>
        <input
          id="objeto-assunto-processo"
          value={valores.objetoAssunto || ""}
          onChange={(e) => mudarCampo("objetoAssunto", e.target.value)}
        />
      </div>

      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="proxima-providencia-processo">Próxima providência</label>
        <input
          id="proxima-providencia-processo"
          value={valores.proximaProvidencia || ""}
          onChange={(e) => mudarCampo("proximaProvidencia", e.target.value)}
        />
      </div>

      <div className="form-row" style={{ marginTop: 14 }}>
        <div className="field">
          <label htmlFor="data-verificar-processo">Data para verificar</label>
          <input
            id="data-verificar-processo"
            type="date"
            value={valores.dataVerificar || ""}
            onChange={(e) => mudarCampo("dataVerificar", e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="prazo-final-processo">Prazo final</label>
          <input
            id="prazo-final-processo"
            type="date"
            value={valores.prazoFinal || ""}
            onChange={(e) => mudarCampo("prazoFinal", e.target.value)}
          />
        </div>
      </div>

      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="observacoes-processo">Observações</label>
        <textarea
          id="observacoes-processo"
          value={valores.observacoes || ""}
          onChange={(e) => mudarCampo("observacoes", e.target.value)}
        />
      </div>

      <div className="form-row" style={{ marginTop: 14 }}>
        <div className="field">
          <label htmlFor="fase-processo">Fase atual</label>
          <Select
            id="fase-processo"
            opcoes={opcoesComVazio(fases, valores.faseId || "")}
            valor={valores.faseId || ""}
            onMudar={(v) => mudarCampo("faseId", v)}
          />
        </div>
        <div className="field">
          <label htmlFor="situacao-processo">Situação atual</label>
          <Select
            id="situacao-processo"
            opcoes={opcoesComVazio(situacoes, valores.situacaoId || "")}
            valor={valores.situacaoId || ""}
            onMudar={(v) => mudarCampo("situacaoId", v)}
          />
        </div>
      </div>
    </>
  );
}
