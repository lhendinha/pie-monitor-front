import { useCallback, useState } from "react";

/** O último subgrupo usado numa tela, lembrado entre visitas.
 *
 * 🔴 O padrão era `subgrupos[subgrupos.length - 1]`, e o comentário ao lado
 * dizia "o último da lista, que é o mais recente, que é o que costuma estar
 * em uso". Nenhuma das três afirmações se sustentava: a listagem passou a
 * vir em ordem ALFABÉTICA, então o último é o último do alfabeto; mesmo na
 * ordem antiga, "mais recente" não é "mais usado"; e quem trabalha num
 * subgrupo específico trocava a pílula toda vez que entrava na tela.
 *
 * Lembrar o que a pessoa escolheu acerta em quem tem rotina e não piora nada
 * pra quem não tem -- na primeira visita o comportamento é o mesmo de antes.
 *
 * ⚠️ Guarda o NOME junto do id. A pílula só carrega a primeira página de
 * subgrupos; sem o nome, quem trabalha num subgrupo fora dela reabriria a
 * tela com o id cru no rótulo.
 *
 * ⚠️ Uma memória POR TELA. O quadro escolhe um subgrupo e a agenda escolhe
 * vários -- e o que a pessoa quer ver num não diz o que ela quer ver no
 * outro.
 */
interface SubgrupoLembrado {
  id: string;
  nome: string;
}

/* ⚠️ `pje-monitor-` de propósito, mesmo o produto sendo Argos: é chave de
   `localStorage` já gravada nos navegadores. Trocar não migra, esquece --
   aqui o custo é só perder a lembrança do último subgrupo, bem menor que o
   de `services/auth.ts`, mas a razão é a mesma. */
const PREFIXO = "pje-monitor-ultimo-subgrupo-";

function ler(chave: string): SubgrupoLembrado | null {
  /* ⚠️ `localStorage` LANÇA em navegação privada e com cookies bloqueados --
     não devolve vazio, estoura. Uma preferência de conveniência não pode
     derrubar a tela. */
  try {
    const cru = localStorage.getItem(chave);
    if (!cru) return null;
    const valor = JSON.parse(cru) as SubgrupoLembrado;
    return valor && typeof valor.id === "string" ? valor : null;
  } catch {
    return null;
  }
}

export function useUltimoSubgrupo(tela: "kanban" | "agenda") {
  const chave = PREFIXO + tela;
  const [lembrado, setLembrado] = useState<SubgrupoLembrado | null>(() => ler(chave));

  const lembrar = useCallback(
    (id: string, nome: string) => {
      /* ⚠️ Id vazio não vira memória. Hoje a pílula de subgrupo não tem como
         produzir um (não tem X nem linha "Todas as X"), mas gravar `{id:""}`
         deixaria lixo no `localStorage` de quem usa o sistema -- e o defeito
         só apareceria muito depois, como uma tela abrindo no subgrupo errado. */
      if (!id) return;
      const valor = { id, nome };
      setLembrado(valor);
      try {
        localStorage.setItem(chave, JSON.stringify(valor));
      } catch {
        /* Sem memória entre visitas; a escolha desta sessão continua valendo. */
      }
    },
    [chave],
  );

  return { lembrado, lembrar };
}
