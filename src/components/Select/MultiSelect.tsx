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
  /** As opções ainda estão vindo.
   *
   * Lista vazia significa duas coisas -- "não existe nenhuma" e "ainda não
   * chegou" -- e um seletor vazio e clicável faz a pessoa concluir a
   * primeira. Aqui ele fica travado e o texto diz o que está acontecendo,
   * em vez de mentir por omissão. */
  carregando?: boolean;
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
  carregando,
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

  /** Escape com o menu ABERTO fecha só o menu -- nunca o que está atrás.
   *
   * 🔴 `Modal` e `useFecharAoClicarFora` escutam `keydown` no `document`,
   * sem coordenação nenhuma. Com o menu aberto DENTRO de um modal, um
   * Escape fechava os dois de uma vez: quem só queria dispensar a lista
   * perdia o formulário inteiro e o texto já digitado. Apareceu numa
   * verificação em Chrome -- mas jsdom reproduz, e há teste
   * (`Select/index.test.tsx`): não existia porque ninguém tinha escrito.
   *
   * ⚠️ `stopPropagation`, e NÃO `preventDefault`: o `onKeyDown` daqui roda
   * ANTES do handler do react-select, e ele desiste do próprio tratamento
   * se o evento vier com `defaultPrevented`. Prevenir fecharia o modal e
   * deixaria o menu aberto -- o inverso exato do que se quer.
   */
  function aoTeclar(evento: React.KeyboardEvent) {
    if (evento.key !== "Escape" || !aberto) return;
    evento.stopPropagation();
    if (chip) fechar();
  }

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
      /* "Carregando…" seco, de propósito: mensagem que ENUMERA o que está
         vindo ("Carregando os subgrupos…") vira dívida -- toda consulta
         nova que a tela ganhar exige reescrever a frase, e quem esquecer
         deixa uma mentira parcial na tela. */
      placeholder={carregando ? "Carregando…" : placeholder}
      isDisabled={carregando}
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
      onMenuOpen={chip ? abrir : () => setAberto(true)}
      /* Ver `Select.tsx`: no `chip` o `onMenuClose` da lib é ignorado de
         propósito; aqui ele só registra que o menu fechou. */
      onMenuClose={chip ? undefined : () => setAberto(false)}
      onKeyDown={aoTeclar}
      styles={chip ? estilosChip(selecionados.length > 0) : estilosSelect(false, selecionados.length === 0)}
      components={{
        ...SEM_INDICADORES,
        Option: OpcaoComCheckbox,
        ValueContainer: ResumoSelecionados,
        ...(chip ? { Menu: MenuDeFiltro } : {}),
      }}
      {...(chip
        ? {
            /* Diz ao `ResumoSelecionados` pra NÃO pintar o texto de
               placeholder: na pílula, quem manda na cor é o control. */
            ehPilula: true,
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
