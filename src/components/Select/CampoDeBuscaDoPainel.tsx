import { Box, Input } from "@chakra-ui/react";
import { useEffect, useRef } from "react";

interface CampoDeBuscaDoPainelProps {
  valor: string;
  onMudar: (valor: string) => void;
  placeholder: string;
  onEscape: () => void;
}

/** A caixa de digitar, no TOPO DO PAINEL -- não dentro da pílula.
 *
 * 🔴 O `isSearchable` do react-select põe o cursor dentro do próprio
 * controle, e o controle aqui É a pílula: ela mostra o rótulo escolhido
 * ("3 selecionados"), tem largura de rótulo e caixa alta. Digitar ali
 * apagaria o rótulo e faria a pílula pular de largura a cada letra.
 *
 * Por isso a lib fica com `isSearchable={false}` e a busca é nossa: o termo
 * mora no `Select`, que ou filtra a lista que já tem (fase, situação) ou
 * pede a próxima ao servidor (cliente, subgrupo, pessoa). Do ponto de vista
 * do react-select nada mudou -- ele só recebe uma lista de opções menor.
 *
 * ⚠️ Isto só é possível porque o painel do chip é CONTROLADO (`menuIsOpen`):
 * com o menu da lib, tirar o foco do controle o fecharia, e o foco tem que
 * vir pra cá pra a pessoa digitar.
 */
export function CampoDeBuscaDoPainel({
  valor,
  onMudar,
  placeholder,
  onEscape,
}: CampoDeBuscaDoPainelProps) {
  const campo = useRef<HTMLInputElement>(null);

  /* O painel abre pra pessoa escolher; se ela vai digitar, o cursor já
     precisa estar aqui. Sem isto a primeira tecla se perde. */
  useEffect(() => {
    campo.current?.focus();
  }, []);

  return (
    <Box px="8px" pt="8px" pb="2px">
      <Input
        ref={campo}
        size="sm"
        fontSize="13px"
        autoComplete="off"
        aria-label={placeholder}
        placeholder={placeholder}
        value={valor}
        onChange={(e) => onMudar(e.target.value)}
        /* ⚠️ O react-select trata mousedown no menu como "clique numa
           opção" e devolve o foco ao controle -- o cursor saltava daqui na
           primeira tentativa de clicar no campo. */
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key !== "Escape") return;
          /* Barra o listener de `document` (o mesmo de `Select`): Esc aqui
             dispensa a lista, e não o modal que está atrás dela. */
          e.stopPropagation();
          onEscape();
        }}
      />
    </Box>
  );
}
