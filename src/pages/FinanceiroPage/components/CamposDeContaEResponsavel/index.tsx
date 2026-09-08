import { useQuery } from "@tanstack/react-query";

import { Campo, LinhaDeCampos, Select } from "../../../../components";
import { getEmail, listarMembrosDoSubgrupo } from "../../../../services";
import { qk } from "../../../../services/queryKeys";
import { opcoesDeConta } from "../../opcoesDoCatalogo";
import type { RespostaDeMembros } from "../../../../types/respostas";
import type { CamposDeContaEResponsavelProps } from "./types";

/** Onde o dinheiro se move e quem responde por ele. A dupla se repete nos
 * três formulários.
 *
 * 🔴 **As pessoas saem do DEPARTAMENTO, e não do grupo.**
 * `GET /grupos/membros` tem piso `manager`, e quem tem o papel `financeiro`
 * pode não ser -- o campo responderia 403 e ficaria vazio para exatamente
 * quem usa esta tela todo dia. `listarMembrosDoSubgrupo` tem piso `user` e o
 * recorte é participar do subgrupo, que é a mesma régua do servidor. Mesma
 * escolha de `CampoDeResponsaveis`.
 *
 * ⚠️ **Quem está logado aparece sempre**, mesmo que a lista ainda não tenha
 * chegado ou que ele não esteja naquele departamento: é o padrão do campo, e
 * um select cujo valor não está entre as opções mostra vazio -- pareceria
 * que ninguém responde pelo lançamento.
 *
 * ➡️ os testes dos modais de lançamento.
 */
export default function CamposDeContaEResponsavel({
  catalogo, contaId, onConta, responsavel, onResponsavel, subgrupoId, tentou, semConta,
}: CamposDeContaEResponsavelProps) {
  const membros = useQuery<RespostaDeMembros>({
    queryKey: qk.membrosDoSubgrupo(subgrupoId),
    queryFn: () => listarMembrosDoSubgrupo(subgrupoId) as Promise<RespostaDeMembros>,
    enabled: Boolean(subgrupoId),
  });

  const lista = membros.data?.membros ?? [];
  const eu = getEmail() ?? "";
  const opcoesDePessoa = [
    ...lista.map((m) => ({ value: m.email, label: m.apelido || m.email })),
    ...(eu && !lista.some((m) => m.email === eu) ? [{ value: eu, label: eu }] : []),
  ];

  return (
    <LinhaDeCampos>
      <Campo
        rotulo="Conta"
        para="lc-conta"
        obrigatorio
        erro={tentou && semConta ? "Escolha a conta." : undefined}
      >
        <Select
          id="lc-conta"
          opcoes={opcoesDeConta(catalogo)}
          valor={contaId}
          onMudar={onConta}
          placeholder="Selecione a conta"
        />
      </Campo>
      <Campo rotulo="Responsável" para="lc-responsavel">
        <Select
          id="lc-responsavel"
          opcoes={opcoesDePessoa}
          valor={responsavel}
          onMudar={onResponsavel}
        />
      </Campo>
    </LinhaDeCampos>
  );
}
