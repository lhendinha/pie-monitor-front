import { Botao, EstadoVazio } from "../../../../components";
import type { QuadroSemColunasProps } from "./types";

/** 🔴 Subgrupo SEM COLUNA NENHUMA -- e a tela não pode ficar em branco.
 *
 * `subgrupos_service.criar` semeia o quadro padrão junto, então o caminho
 * normal nunca chega aqui. Mas quadro sem coluna é um estado ALCANÇÁVEL:
 * subgrupo gravado fora do serviço (foi o que aconteceu na semeadura local, e
 * a tela de Kanban abria em branco no primeiro clique de quem subia o
 * ambiente), criação que falhou no meio, ou alguém que apagou as colunas uma
 * a uma.
 *
 * Antes disto o quadro simplesmente não desenhava nada: sem colunas, sem
 * mensagem, sem erro. Com cara de sistema quebrado, e sem dizer a ninguém o
 * que fazer.
 *
 * ⚠️ A mensagem muda com quem está olhando, porque a saída é outra: criar
 * coluna é `admin` (o servidor exige), então quem PODE resolver recebe o
 * caminho e quem não pode recebe a quem pedir. Uma frase só ou mandaria o
 * admin procurar outra pessoa, ou mandaria o `user` para um botão que ele
 * não tem.
 */
export default function QuadroSemColunas({ podeMontar, onEditarQuadro }: QuadroSemColunasProps) {
  return (
    <EstadoVazio
      mensagem={
        podeMontar
          ? "Este subgrupo ainda não tem quadro. Crie as colunas para começar a usar o kanban."
          : "O quadro deste subgrupo ainda não foi montado. Peça a um admin para criar as colunas."
      }
      acao={
        podeMontar ? (
          <Botao variante="ghost" onClick={onEditarQuadro}>
            Editar quadro
          </Botao>
        ) : undefined
      }
    />
  );
}
