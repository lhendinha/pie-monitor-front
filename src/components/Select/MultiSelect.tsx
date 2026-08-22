import { useCallback, useState } from "react";
import ReactSelect from "react-select";
import { ALTURA_MAXIMA_MENU, SEM_INDICADORES } from "../../constants/select";
import { SELETOR_CAMADA_FLUTUANTE } from "../../constants/camadaFlutuante";
import { useFecharAoClicarFora } from "../../hooks/useFecharAoClicarFora";
import { estilosChip, estilosSelect, semOpcoesDisponiveis } from "../../utils/select";
import { MenuDeFiltro } from "./MenuDeFiltro";
import { OpcaoComCheckbox } from "./OpcaoComCheckbox";
import { ResumoSelecionados } from "./ResumoSelecionados";
import type { Opcao } from "./types";

interface MultiSelectProps {
  id?: string;
  opcoes: Opcao[];
  selecionados: string[];
  onMudar: (valores: string[]) => void;
  placeholder?: string;
  /** "chip" desenha o controle como a pílula de filtro do artifact.
   *
   * O rótulo mostra a seleção -- é o `ResumoSelecionados` (ValueContainer
   * já existente no projeto) que troca as tags padrão por texto: um nome
   * quando é um só, "N selecionados" quando são muitos. É por isso que o
   * artifact não precisa de chips removíveis embaixo da barra. */
  variante?: "padrao" | "chip";
}

/** Dropdown fechado com checkboxes -- mesmo visual do `Select` de valor
 * único, mas permitindo múltipla seleção. */
export function MultiSelect({
  id,
  opcoes,
  selecionados,
  onMudar,
  placeholder = "Selecione",
  variante = "padrao",
}: MultiSelectProps) {
  const chip = variante === "chip";

  /** Na variante "chip" a seleção é MÚLTIPLA e o painel tem Cancelar/
   * Aplicar, então o clique nas caixas mexe num rascunho -- aplicar a cada
   * clique dispararia uma busca por caixa marcada, e quem quer três
   * situações faria três requisições pra chegar onde queria. */
  const [rascunho, setRascunho] = useState<string[]>(selecionados);
  /** O painel é 100% controlado, e o `onMenuClose` da lib é ignorado de
   * propósito. Marcar uma opção tira o foco do input interno, e a lib trata
   * essa perda de foco como "fechar" -- o painel sumia no primeiro clique,
   * antes de a pessoa chegar no "Aplicar". Quem fecha é: o rodapé, o Esc, e
   * o clique fora (`useFecharAoClicarFora`). */
  const [aberto, setAberto] = useState(false);
  /** Com o painel fechado o rótulo do chip mostra o que está APLICADO, e
   * não o rascunho: assim cancelar (ou clicar fora) volta ao rótulo certo
   * sem precisar limpar o rascunho em cada caminho de saída. */
  const valores = chip && aberto ? rascunho : selecionados;

  const fechar = useCallback(() => setAberto(false), []);
  useFecharAoClicarFora(chip && aberto, fechar, SELETOR_CAMADA_FLUTUANTE);

  function abrir() {
    // ⚠️ Só reseta o rascunho quando o painel estava mesmo FECHADO. Com
    // `openMenuOnFocus`, clicar no rodapé devolve o foco ao input interno e
    // a lib chama `onMenuOpen` de novo -- sem essa guarda, o mousedown no
    // "Aplicar" zerava a seleção um instante antes do click aplicá-la.
    if (aberto) return;
    // O rascunho nasce do que está aplicado: reabrir depois de cancelar
    // não pode trazer de volta o que foi descartado.
    setRascunho(selecionados);
    setAberto(true);
  }

  function aplicar() {
    onMudar(rascunho);
    fechar();
  }
  return (
    <ReactSelect<Opcao, true>
      isMulti
      unstyled
      inputId={id}
      options={opcoes}
      value={opcoes.filter((o) => valores.includes(o.value))}
      onChange={(escolhidas) => {
        const ids = escolhidas.map((o) => o.value);
        if (chip) setRascunho(ids);
        else onMudar(ids);
      }}
      placeholder={placeholder}
      isSearchable={false}
      isClearable={false}
      closeMenuOnSelect={false}
      hideSelectedOptions={false}
      openMenuOnFocus
      menuPlacement="auto"
      menuPosition="fixed"
      maxMenuHeight={ALTURA_MAXIMA_MENU}
      menuPortalTarget={document.body}
      menuIsOpen={chip ? aberto : undefined}
      onMenuOpen={chip ? abrir : undefined}
      styles={chip ? estilosChip(selecionados.length > 0) : estilosSelect(false, selecionados.length === 0)}
      components={{
        ...SEM_INDICADORES,
        Option: OpcaoComCheckbox,
        ValueContainer: ResumoSelecionados,
        ...(chip ? { Menu: MenuDeFiltro } : {}),
      }}
      {...(chip
        ? {
            rotuloTodas: placeholder,
            nenhumSelecionado: rascunho.length === 0,
            onTodas: () => setRascunho([]),
            onCancelar: fechar,
            onAplicar: aplicar,
          }
        : {})}
      noOptionsMessage={semOpcoesDisponiveis}
    />
  );
}
