import { Table } from "@chakra-ui/react";

import { BotaoQuadrado, IconeOlho, IconeOlhoCortado } from "../../../../components";
import type { LinhaDoCatalogoProps } from "./types";

/** Uma linha das tabelas de Configurações -- conta, categoria ou centro.
 *
 * 🔴 **A LINHA é o gesto de editar**, e não um lápis: é o padrão das
 * tabelas do projeto (Clientes, Processos, Membros), com `tabIndex`,
 * `cursor: pointer` e Enter/Espaço pelo teclado. A primeira versão desta
 * tela usava lista sem cabeçalho e dois botões por linha; o usuário
 * apontou que destoava, e a medição deu razão a ele.
 *
 * ⚠️ **O olho de desativar/reativar CONTINUA na linha**, e isso não é
 * inconsistência: `Membros` faz igual -- linha clicável e um botão que
 * sobra. O clique da linha carrega UMA ação, e estas linhas têm duas;
 * sem o botão, desativar ficaria sem gesto.
 *
 * 🔴 O clique no botão NÃO pode abrir o modal junto: `stopPropagation`, ou
 * desativar uma conta abriria o formulário de renomeá-la por cima.
 *
 * ⚠️ Sem `onAbrir` (quem não administra) a linha deixa de ser clicável e
 * perde o `tabIndex`: um alvo de teclado que não faz nada é pior que alvo
 * nenhum.
 *
 * ➡️ `pages/FinanceiroPage/index.test.tsx`.
 */
export default function LinhaDoCatalogo({
  children,
  nome,
  ativo,
  onAbrir,
  onAlternarAtivo,
  ocupada = false,
}: LinhaDoCatalogoProps) {
  return (
    <Table.Row
      tabIndex={onAbrir ? 0 : undefined}
      cursor={onAbrir ? "pointer" : undefined}
      _hover={onAbrir ? { bg: "bg.canvas" } : undefined}
      _focusVisible={{
        outline: "2px solid",
        outlineColor: "fg.brand",
        outlineOffset: "-2px",
      }}
      _last={{ "& td": { borderBottomWidth: 0 } }}
      opacity={ativo ? 1 : 0.55}
      onClick={onAbrir}
      onKeyDown={(e) => {
        if (!onAbrir) return;
        /* 🔴 Só quando a tecla é da PRÓPRIA linha. O centro de custo se
           renomeia num campo DENTRO dela, e sem esta guarda o Enter de quem
           está digitando era engolido aqui -- o rename nunca chegava ao
           servidor, e a linha reabria o editor por cima. */
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onAbrir();
        }
      }}
    >
      {children}
      <Table.Cell
        p="13px 14px"
        width="56px"
        borderBottomWidth="1px"
        borderBottomColor="border.subtle"
        /* 🔴 16px no SVG: `IconeOlho` e `IconeOlhoCortado` NÃO trazem tamanho
           próprio (`IconeLixeira` traz, e por isso a linha de inscrição não
           precisa disto). Sem a regra eles viram 32px e a linha incha -- foi
           o que apareceu na tela quando estas listas viraram tabela, porque
           quem dava o tamanho antes era o `LinhaDeLista`. */
        css={{ "& svg": { width: "16px", height: "16px", flex: "0 0 auto" } }}
      >
        {onAlternarAtivo && (
          <BotaoQuadrado
            type="button"
            tom={ativo ? "perigo" : "neutro"}
            title={ativo ? "Desativar" : "Reativar"}
            aria-label={`${ativo ? "Desativar" : "Reativar"} ${nome}`}
            disabled={ocupada}
            onClick={(e) => {
              e.stopPropagation();
              onAlternarAtivo();
            }}
          >
            {ativo ? <IconeOlhoCortado /> : <IconeOlho />}
          </BotaoQuadrado>
        )}
      </Table.Cell>
    </Table.Row>
  );
}
