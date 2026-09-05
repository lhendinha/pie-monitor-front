import { useQuery } from "@tanstack/react-query";

import { MultiSelect } from "../Select/MultiSelect";
import { listarMembrosDoSubgrupo } from "../../services";
import { podeRemoverResponsavel } from "./podeRemoverResponsavel";
import { qk } from "../../services/queryKeys";
import type { RespostaDeMembros } from "../../types/respostas";
import type { CampoDeResponsaveisProps } from "./types";

/** Quem RESPONDE por um processo ou atendimento -- e, por isso, quem recebe
 * os avisos dele.
 *
 * ⚠️ Vive em `components/`, e não dentro de uma página: Processos e
 * Atendimentos usam os dois, e uma segunda cópia divergiria no primeiro
 * ajuste.
 *
 * 🔴 **Múltiplo, ao contrário do campo de responsável de Tarefa e Documento.**
 * Tarefa é trabalho individual e usa o vazio como pool (a Área de trabalho
 * oferece as sem dono pra alguém assumir); documento é anexo. Processo é
 * ACOMPANHADO, e por mais de uma pessoa.
 *
 * ⚠️ **Sem `permitirLimpar`.** O X do `MultiSelect` esvazia sem abrir o
 * painel -- e num campo de mínimo 1 isso leva direto a um 422 no salvamento.
 * A pessoa usaria um controle que o próprio formulário oferece pra chegar num
 * erro do servidor.
 *
 * ⚠️ **`carregando` é passado.** Enquanto os membros não chegam, lista vazia
 * diria "não há ninguém neste subgrupo" -- a mentira que aquela prop existe
 * pra evitar.
 */
export function CampoDeResponsaveis({
  id,
  subgrupoId,
  valor,
  nomes,
  onMudar,
}: CampoDeResponsaveisProps) {
  /* Piso `user`, e o recorte é participar do subgrupo -- a mesma régua que o
     servidor aplica em `garantir_membros_do_subgrupo`. Ler as opções daqui,
     e não do catálogo do grupo, é o que faz o campo funcionar pra quem é
     `user`: a lista do grupo só chega de `manager` pra cima. */
  const membrosQuery = useQuery<RespostaDeMembros>({
    queryKey: qk.membrosDoSubgrupo(subgrupoId),
    queryFn: () => listarMembrosDoSubgrupo(subgrupoId) as Promise<RespostaDeMembros>,
    enabled: Boolean(subgrupoId),
  });
  const membros = membrosQuery.data?.membros ?? [];

  const nomePorEmail = new Map(valor.map((email, i) => [email, nomes?.[i] ?? email]));
  const opcoes = [
    ...membros.map((m) => ({ value: m.email, label: m.apelido || m.email })),
    /* Quem já é responsável mas NÃO está mais entre os membros. Sem isto,
       abrir o item mostraria a lista sem essa pessoa e salvar apagaria a
       atribuição dela em silêncio. */
    ...valor
      .filter((email) => !membros.some((m) => m.email === email))
      .map((email) => ({ value: email, label: nomePorEmail.get(email) ?? email })),
  ];

  /* Quem é `user` não pode DESMARCAR colega -- só a si mesmo. Sem isto o
     "x" existiria, o PATCH sairia e o servidor devolveria 400 num campo que
     a pessoa achava que podia mexer. */
  function aoMudar(novos: string[]) {
    const tirados = valor.filter((e) => !novos.includes(e));
    if (tirados.some((e) => !podeRemoverResponsavel(e))) return;
    onMudar(novos);
  }

  return (
    <MultiSelect
      id={id}
      opcoes={opcoes}
      selecionados={valor}
      onMudar={aoMudar}
      placeholder="Selecione quem responde"
      permitirBusca
      placeholderBusca="Buscar pessoa"
      carregando={membrosQuery.isPending && Boolean(subgrupoId)}
      erro={membrosQuery.isError}
      onTentarDeNovo={() => membrosQuery.refetch()}
    />
  );
}
