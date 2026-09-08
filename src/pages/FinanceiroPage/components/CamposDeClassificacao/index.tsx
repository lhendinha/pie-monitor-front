import { Campo, LinhaDeCampos, Select } from "../../../../components";
import { opcoesDeCategoria, opcoesDeCentro } from "../../../../utils";
import CampoDeDepartamentos from "../CampoDeDepartamentos";
import type { CamposDeClassificacaoProps } from "./types";

/** Como o lançamento se classifica: categoria, centro de custo e
 * departamento. Os três repetem nos formulários de honorário, entrada e
 * saída -- é a terceira cópia que vira componente, a régua do projeto.
 *
 * 🔴 **Departamento é OBRIGATÓRIO; centro de custo, não.** Eles respondem
 * perguntas diferentes: o departamento é a equipe do escritório (o subgrupo,
 * que existe no sistema inteiro) e todo dinheiro pertence a alguma; o centro
 * de custo é projeto ou filial, e a maioria dos escritórios nunca cria
 * nenhum. Por isso o centro vem DEPOIS e sem destaque, como a Fase 5 pede.
 *
 * ⚠️ **O departamento fica por último, e não junto da categoria.** Ele é o
 * que pode virar várias linhas -- e um campo que cresce no meio da grade
 * empurraria os de baixo a cada divisão.
 *
 * ➡️ os testes dos modais de lançamento.
 */
export default function CamposDeClassificacao({
  catalogo, natureza,
  categoriaId, onCategoria,
  centroId, onCentro,
  rateio, onRateio, valorTotalCentavos,
  tentou, semCategoria, semDepartamento, rateioNaoFecha,
}: CamposDeClassificacaoProps) {
  return (
    <>
      <LinhaDeCampos>
        <Campo
          rotulo="Categoria"
          para="lc-categoria"
          obrigatorio
          erro={tentou && semCategoria ? "Escolha a categoria." : undefined}
        >
          <Select
            id="lc-categoria"
            opcoes={opcoesDeCategoria(catalogo, natureza)}
            valor={categoriaId}
            onMudar={onCategoria}
            placeholder="Selecione a categoria"
          />
        </Campo>
        <Campo rotulo="Centro de custo" para="lc-centro">
          <Select
            id="lc-centro"
            opcoes={opcoesDeCentro(catalogo)}
            valor={centroId}
            onMudar={onCentro}
          />
        </Campo>
      </LinhaDeCampos>

      <Campo
        rotulo="Departamento"
        para="lc-departamento"
        obrigatorio
        /* ⚠️ A dica some quando o campo está DIVIDIDO: ali o controle tem
           várias linhas e um link no fim, e a dica caía embaixo dele --
           lendo como legenda do link, não do campo. */
        dica={rateio.length > 1 ? undefined : "A equipe a que este dinheiro pertence."}
        erro={
          tentou && semDepartamento
            ? "Escolha o departamento."
            : tentou && rateioNaoFecha
              ? "A soma dos departamentos tem de ser igual ao valor do lançamento."
              : undefined
        }
      >
        <CampoDeDepartamentos
          id="lc-departamento"
          valor={rateio}
          onMudar={onRateio}
          valorTotalCentavos={valorTotalCentavos}
        />
      </Campo>
    </>
  );
}
