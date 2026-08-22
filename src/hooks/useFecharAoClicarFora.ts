import { useEffect } from "react";

/** Fecha um painel quando o clique cai fora dele.
 *
 * `seletorInterno` existe porque o painel do filtro é renderizado por
 * portal em `document.body` -- ele não está dentro de nenhum elemento que
 * dê pra segurar por ref a partir de quem abriu. O portal se marca com um
 * atributo, e o clique dentro dele é reconhecido pelo `closest`.
 *
 * ⚠️ O listener entra num `setTimeout(0)`, e não direto: o próprio clique
 * que ABRE o painel ainda está subindo até o `document` quando o efeito
 * roda. Registrando na hora, esse mesmo clique fecharia o painel no mesmo
 * gesto que o abriu.
 */
export function useFecharAoClicarFora(
  aberto: boolean,
  fechar: () => void,
  seletorInterno: string,
) {
  useEffect(() => {
    if (!aberto) return;

    function aoApontar(evento: MouseEvent) {
      const alvo = evento.target as HTMLElement | null;
      if (alvo?.closest(seletorInterno)) return;
      fechar();
    }
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") fechar();
    }

    const agendado = window.setTimeout(() => {
      document.addEventListener("mousedown", aoApontar);
    });
    document.addEventListener("keydown", aoTeclar);

    return () => {
      window.clearTimeout(agendado);
      document.removeEventListener("mousedown", aoApontar);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto, fechar, seletorInterno]);
}
