import { useCallback, useState } from "react";
import ReactSelect from "react-select";

import { ALTURA_MAXIMA_MENU, SEM_INDICADORES } from "../../constants/select";
import { SELETOR_CAMADA_FLUTUANTE } from "../../constants/camadaFlutuante";
import { useFecharAoClicarFora } from "../../hooks/useFecharAoClicarFora";
import { estilosChip, estilosSelect, semOpcoesDisponiveis } from "../../utils/select";
import { MenuDeFiltro } from "./MenuDeFiltro";
import { SetaDoSelect } from "./SetaDoSelect";
import type { Opcao } from "./types";

interface SelectProps {
  id?: string;
  opcoes: Opcao[];
  valor: string;
  onMudar: (valor: string) => void;
  placeholder?: string;
  /** Ver `MultiSelect` -- mesma variante, pro filtro de valor único.
   *
   * Aqui o painel NÃO tem rodapé: escolher já aplica, porque com valor
   * único não existe "montar uma seleção" pra confirmar depois. O
   * `placeholder` vira a linha "Todos os X" no topo, que é como o artifact
   * oferece o "sem filtro" -- por isso a lista de opções não precisa (nem
   * deve) trazer uma opção de valor vazio. */
  variante?: "padrao" | "chip";
  compacto?: boolean;
  /** Largura fixa quando o contexto exige (72px no "Por página" do
   * artifact). Sem ela o controle acompanha o container. */
  largura?: string;
  /** Campo que existe pra ser LIDO, não escolhido -- o subgrupo de uma
   * tarefa já criada, por exemplo, que faz parte da chave e não muda.
   * Mostrar desabilitado diz onde a coisa está; esconder deixaria a pessoa
   * sem saber. */
  desabilitado?: boolean;
  /** As opções ainda estão vindo.
   *
   * Trava o controle e troca o texto por "Carregando…". Sem isto, um select
   * de lista vazia é indistinguível de "não há nenhuma opção" -- e o de
   * Fase/Situação chega a oferecer só "Nenhuma", que é uma resposta errada
   * enquanto a lista não chegou.
   *
   * A mensagem é genérica de propósito: enumerar o que está vindo obriga a
   * reescrever a frase toda vez que a tela ganha outra consulta. */
  carregando?: boolean;
}

/** Substitui o `<select>` nativo -- mesmo visual do `Select`/`MultiSelect`,
 * valor único. */
export function Select({
  id,
  opcoes,
  valor,
  onMudar,
  placeholder = "Selecione",
  compacto = false,
  largura,
  variante = "padrao",
  desabilitado = false,
  carregando = false,
}: SelectProps) {
  const chip = variante === "chip";
  /** Mesmo motivo do `MultiSelect`: com o menu controlado, o `onMenuClose`
   * que a lib dispara ao perder o foco não fecha o painel sozinho -- quem
   * fecha é escolher uma opção, o Esc ou o clique fora. */
  const [aberto, setAberto] = useState(false);
  const fechar = useCallback(() => setAberto(false), []);
  useFecharAoClicarFora(chip && aberto, fechar, SELETOR_CAMADA_FLUTUANTE);

  function escolher(novo: string) {
    onMudar(novo);
    fechar();
  }

  return (
    <ReactSelect<Opcao, false>
      unstyled
      inputId={id}
      options={opcoes}
      value={opcoes.find((o) => o.value === valor) ?? null}
      onChange={(opcao) => opcao && escolher(opcao.value)}
      placeholder={carregando ? "Carregando…" : placeholder}
      isSearchable={false}
      isClearable={false}
      isDisabled={desabilitado || carregando}
      openMenuOnFocus
      menuPlacement="auto"
      menuPosition="fixed"
      maxMenuHeight={ALTURA_MAXIMA_MENU}
      menuPortalTarget={document.body}
      menuIsOpen={chip ? aberto : undefined}
      onMenuOpen={chip ? () => setAberto(true) : undefined}
      styles={
        chip
          ? estilosChip(Boolean(valor), "linha")
          : // `largura` entra no container: o menu é portalado e se alinha
            // pela largura do controle, então fixar o container basta.
            {
              ...estilosSelect(compacto, !valor),
              container: (base) => ({ ...base, width: largura }),
            }
      }
      components={
        chip
          ? { ...SEM_INDICADORES, Menu: MenuDeFiltro }
          : { IndicatorSeparator: () => null, DropdownIndicator: SetaDoSelect }
      }
      {...(chip
        ? {
            rotuloTodas: placeholder,
            nenhumSelecionado: !valor,
            onTodas: () => escolher(""),
          }
        : {})}
      noOptionsMessage={semOpcoesDisponiveis}
    />
  );
}
