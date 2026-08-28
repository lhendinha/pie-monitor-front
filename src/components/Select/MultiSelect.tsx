import { useCallback, useState } from "react";
import ReactSelect from "react-select";
import { ALTURA_MAXIMA_MENU, SEM_INDICADORES } from "../../constants/select";
import { SELETOR_CAMADA_FLUTUANTE } from "../../constants/camadaFlutuante";
import { useFecharAoClicarFora } from "../../hooks/useFecharAoClicarFora";
import { contemTermo } from "../../utils/texto";
import { estilosChip, estilosSelect, semOpcoesDisponiveis } from "../../utils/select";
import { BotaoDeLimpar } from "./BotaoDeLimpar";
import { FalhaDoPainel } from "./EstadosDoPainel";
import { MenuDeFiltro } from "./MenuDeFiltro";
import { OpcaoComCheckbox } from "./OpcaoComCheckbox";
import { ResumoSelecionados } from "./ResumoSelecionados";
import { useBuscaDoPainel } from "./useBuscaDoPainel";
import type { OpcaoDeSelect } from "../../types";

interface MultiSelectProps {
  id?: string;
  opcoes: OpcaoDeSelect[];
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
   * em vez de mentir por omissão.
   *
   * ⚠️ Com `onBuscar` o controle NÃO é travado: ali é ABRIR que dispara a
   * busca, e uma pílula travada enquanto carrega nunca sairia do lugar. */
  carregando?: boolean;
  /** Ver `Select`: digitar para filtrar, **ligado por padrão**. */
  permitirBusca?: boolean;
  /** Ver `Select`: idem, mas quem filtra é o SERVIDOR -- pra lista que pode
   * crescer sem limite (cliente, subgrupo, pessoa). */
  onBuscar?: (termo: string) => void;
  placeholderBusca?: string;
  erro?: boolean;
  onTentarDeNovo?: () => void;
  /** O X que limpa sem abrir o painel.
   *
   * ⚠️ Aqui ele NÃO passa pelo rascunho: limpar tudo é a única ação do
   * painel que se aplica sozinha. Exigir "Aplicar" depois de um botão que
   * diz "limpar" seria pedir confirmação de um gesto que já é explícito --
   * e ele existe justamente pra não ter que abrir o painel. */
  permitirLimpar?: boolean;
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
  permitirBusca = true,
  onBuscar,
  placeholderBusca = "Buscar",
  erro = false,
  onTentarDeNovo,
  permitirLimpar = false,
}: MultiSelectProps) {
  const chip = variante === "chip";
  const remoto = Boolean(onBuscar);

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

  const { busca, mudarBusca, opcoesVisiveis, ocultos } = useBuscaDoPainel(opcoes, aberto, onBuscar);
  /** 🔴 A falha descarta o RESULTADO REMOTO, e o motivo não é cosmético.
   *
   * Com `keepPreviousData`, deixar a lista anterior na tela depois de uma
   * busca que falhou a apresenta como resposta à busca NOVA: a pessoa digita
   * "sil", a consulta morre, e ela lê os clientes de "ang" achando que são
   * os com "sil". Errar em silêncio é pior que não responder.
   *
   * ⚠️ Só no remoto. As opções LOCAIS (o "Sem responsável" do filtro de
   * pessoas, o "Nenhuma" dos campos de fase) não vieram dessa consulta e não
   * têm por que sumir com ela -- foi o defeito da primeira versão, que
   * esvaziava tudo. O aviso de falha convive com o que sobrou; ver
   * `MenuDeFiltro`. */
  const opcoesDoPainel = erro && remoto ? [] : opcoesVisiveis;
  /* Onde a caixa de digitar fica -- ver `Select`. No chip ela vai pro
     painel; no padrão é o `isSearchable` da lib, e o `ResumoSelecionados`
     esconde o "N selecionados" enquanto há texto digitado, senão os dois
     ocupariam a mesma célula do controle. */
  const buscaNoPainel = chip && (permitirBusca || remoto);
  const buscaNoControle = !chip && (permitirBusca || remoto);
  /** Não dá para mexer: esperando a lista chegar. */
  const travado = carregando && !remoto;

  return (
    <ReactSelect<OpcaoDeSelect, true>
      isMulti
      unstyled
      inputId={id}
      options={opcoesDoPainel}
      /* ⚠️ Filtra `opcoes`, e NÃO `opcoesVisiveis`: quem já está marcado sai
         da lista visível assim que a pessoa digita outra coisa, e o rótulo
         da pílula despencaria de "3 selecionados" pra "1" no meio da
         digitação -- sem nada ter sido desmarcado. */
      value={opcoes.filter((o) => valores.includes(o.value))}
      onChange={(escolhidas, meta) => {
        const ids = escolhidas.map((o) => o.value);
        if (!chip) return onMudar(ids);
        /* O X não passa pelo rascunho: aplica na hora (ver `permitirLimpar`). */
        if (meta.action === "clear") {
          setRascunho([]);
          onMudar([]);
          return;
        }
        setRascunho(ids);
      }}
      /* "Carregando…" seco, de propósito: mensagem que ENUMERA o que está
         vindo ("Carregando os subgrupos…") vira dívida -- toda consulta
         nova que a tela ganhar exige reescrever a frase, e quem esquecer
         deixa uma mentira parcial na tela. */
      placeholder={carregando && !remoto ? "Carregando…" : placeholder}
      isDisabled={travado}
      isLoading={remoto && carregando && !erro}
      /* No chip a caixa é nossa e mora no painel (`CampoDeBuscaDoPainel`): a
         da lib nasceria dentro da pílula, por cima do rótulo. */
      /* Ver a nota em `Select`: travado e pesquisável ao mesmo tempo
         apaga o `combobox` do react-select. */
      isSearchable={buscaNoControle && !travado}
      /* Filtro PRÓPRIO: o da lib compara texto cru, e "civel" não acharia
         "Cível". Com `onBuscar` quem filtrou foi o servidor. */
      filterOption={
        buscaNoControle
          ? remoto
            ? () => true
            : (opcao, entrada) => contemTermo(opcao.label, entrada)
          : undefined
      }
      onInputChange={
        buscaNoControle && remoto
          ? (valor, meta) => {
              if (meta.action === "input-change") return mudarBusca(valor);
              /* 🔴 ESCOLHER zera o termo. O react-select faz isso sozinho
                 quando é ele que controla o campo; como aqui quem controla
                 somos nós, o texto ficava preso -- e no múltiplo, que não
                 fecha o menu ao escolher, o `ResumoSelecionados` esconde o
                 "N selecionados" enquanto há texto digitado: a pessoa
                 marcava "Família" e o campo continuava dizendo "famil", sem
                 nenhum sinal de que algo tinha sido escolhido.

                 ⚠️ Os outros eventos (`menu-close`, `input-blur`) ficam de
                 fora de propósito: quem cuida deles é o reset por
                 fechamento, em `useBuscaDoPainel`. */
              if (meta.action === "set-value") mudarBusca("");
            }
          : undefined
      }
      inputValue={buscaNoControle && remoto ? busca : undefined}
      isClearable={permitirLimpar}
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
        ClearIndicator: BotaoDeLimpar,
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
            onFechar: fechar,
            ...(buscaNoPainel ? { busca, onBusca: mudarBusca, placeholderBusca, ocultos: erro ? 0 : ocultos } : {}),
            erro,
            onTentarDeNovo,
            /* Só esmaece o que JÁ está na tela -- na primeira abertura não há
               lista pra esmaecer, e aí quem fala é o "Carregando…". */
            buscando: remoto && carregando && !erro && opcoesDoPainel.length > 0,
          }
        : {})}
      loadingMessage={() => "Carregando…"}
      /* No chip a falha é desenhada pelo `MenuDeFiltro`, junto da lista; no
         padrão não há painel nosso, e ela entra por aqui. */
      noOptionsMessage={
        !chip && erro && onTentarDeNovo
          ? () => <FalhaDoPainel onTentarDeNovo={onTentarDeNovo} />
          : semOpcoesDisponiveis
      }
    />
  );
}
