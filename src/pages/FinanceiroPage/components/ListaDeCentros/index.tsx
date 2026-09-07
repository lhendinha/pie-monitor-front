import { CartaoDeTabela, NomeEditavel } from "../../../../components";
import { contar } from "../../../../utils";
import LinhaDoCatalogo from "../LinhaDoCatalogo";
import NovoCentroInline from "../NovoCentroInline";
import SubcabecalhoDaLista from "../SubcabecalhoDaLista";
import type { ListaDeCentrosProps } from "./types";

/** Recorte gerencial, transversal às categorias -- Cível, Trabalhista.
 *
 * ⚠️ É o único dos três sem modal: centro de custo é só um nome, e um modal
 * para um campo só é uma janela a mais entre a pessoa e o que ela quer.
 * Nasce inline, no topo da lista, e se renomeia NO LUGAR -- pelo mesmo
 * `NomeEditavel` dos subgrupos, que já resolve o Enter, o Escape e o campo
 * que continua aberto quando o servidor recusa.
 *
 * ⚠️ Sem botão no subcabeçalho, e é por isso: o "+ Adicionar" está dentro do
 * cartão, ao lado do campo. Dois lugares para criar a mesma coisa seria a
 * pergunta "qual dos dois?" em toda visita.
 *
 * ➡️ `index.test.tsx`.
 */
export default function ListaDeCentros({
  centros,
  podeEscrever,
  centroEmEdicao,
  salvando,
  onAdicionar,
  onIniciarEdicao,
  onRenomear,
  onCancelarEdicao,
  onAlternarAtivo,
}: ListaDeCentrosProps) {
  return (
    <>
      <SubcabecalhoDaLista
        titulo="Centros de custo"
        contagem={`Mostrando ${centros.length} de ${contar(
          centros.length,
          "centro de custo",
          "centros de custo",
        )}`}
      />
      <CartaoDeTabela>
        {podeEscrever && <NovoCentroInline salvando={salvando} onAdicionar={onAdicionar} />}
        {centros.map((centro) => (
          <LinhaDoCatalogo
            key={centro.centro_id}
            nomeParaRotulo={centro.nome}
            nome={
              <NomeEditavel
                nome={centro.nome}
                rotuloDoCampo={`Novo nome de ${centro.nome}`}
                editando={centroEmEdicao === centro.centro_id}
                podeRenomear={podeEscrever}
                salvando={salvando && centroEmEdicao === centro.centro_id}
                onIniciar={() => onIniciarEdicao(centro.centro_id)}
                onConfirmar={(nome) => onRenomear(centro.centro_id, nome)}
                onCancelar={onCancelarEdicao}
              />
            }
            ativo={centro.ativo}
            detalhe={centro.ativo ? "" : "(Inativo)"}
            /* ⚠️ Sem lápis: quem renomeia clica no PRÓPRIO nome, que é o que
               o `NomeEditavel` oferece. Um lápis ao lado faria dois gestos
               para a mesma coisa. */
            onAlternarAtivo={podeEscrever ? () => onAlternarAtivo(centro) : undefined}
          />
        ))}
      </CartaoDeTabela>
    </>
  );
}
