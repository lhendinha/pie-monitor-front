import type { MensagemDoCanal } from "../types";

/** Quem quer receber mensagens do canal, por tipo.
 *
 * 🔴 **Por que isto existe.** `useCanalDeNotificacoes` nasceu com um
 * consumidor só -- o sino -- e a assinatura mostra isso: `aoChegar: () =>
 * void`, sem argumento nenhum. A mensagem que chega não vai para lugar
 * algum, e tudo que não é `tipo: "notificacao"` é descartado antes.
 *
 * A barra de progresso da importação precisa de `{feitos, total}`, que é
 * **payload**, não gatilho. Sem este barramento, a saída seria a tela abrir
 * uma SEGUNDA conexão WebSocket -- e o hook foi desenhado para uma (o
 * `useEffect(…, [])` abre um socket por montagem, e o comentário sobre
 * `aoChegar` fora das dependências explica por quê).
 *
 * ⚠️ **Estado de módulo, e não contexto React.** O canal é único por aba e
 * vive fora da árvore: quem assina não precisa estar debaixo de um provider,
 * e o sino continua sem saber que existem outros ouvintes.
 */
type Ouvinte = (mensagem: MensagemDoCanal) => void;

const ouvintes = new Map<string, Set<Ouvinte>>();

/** Passa a ouvir um tipo de mensagem. Devolve como parar de ouvir.
 *
 * ⚠️ Devolver o cancelamento em vez de expor um `desassinar(tipo, fn)` é o
 * que impede vazar ouvinte: quem assina não precisa guardar a referência da
 * própria função para removê-la depois.
 */
export function assinarCanal(tipo: string, ouvinte: Ouvinte): () => void {
  const doTipo = ouvintes.get(tipo) ?? new Set<Ouvinte>();
  doTipo.add(ouvinte);
  ouvintes.set(tipo, doTipo);
  return () => {
    doTipo.delete(ouvinte);
    if (doTipo.size === 0) ouvintes.delete(tipo);
  };
}

/** Entrega a mensagem a quem assinou AQUELE tipo.
 *
 * 🔴 **Só quem pediu o tipo recebe** -- não existe assinante genérico, e é
 * deliberado. Um ouvinte "de tudo" faria o progresso da importação chegar a
 * quem só queria notificação, que é justamente a trava que o sino tem hoje
 * de graça (`if (corpo.tipo !== "notificacao") return`).
 *
 * ⚠️ **Um ouvinte que estoura não leva os outros junto.** É o mesmo motivo
 * de `_criar_tolerando_falha` na API: uma exceção no primeiro deixava os
 * demais sem receber, e o canal não é lugar de propagar erro de tela.
 */
export function publicarNoCanal(mensagem: MensagemDoCanal): void {
  const doTipo = ouvintes.get(mensagem.tipo);
  if (!doTipo) return;
  for (const ouvinte of [...doTipo]) {
    try {
      ouvinte(mensagem);
    } catch (erro) {
      console.error("Ouvinte do canal falhou", erro);
    }
  }
}

/** Só para teste: esvazia o registro entre casos. */
export function limparOuvintesDoCanal(): void {
  ouvintes.clear();
}
