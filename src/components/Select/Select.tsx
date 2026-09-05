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
import { SetaDoSelect } from "./SetaDoSelect";
import { useBuscaDoPainel } from "./useBuscaDoPainel";
import type { OpcaoDeSelect } from "../../types";
import type { SelectProps } from "./types";

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
  permitirBusca = true,
  onBuscar,
  placeholderBusca = "Buscar",
  erro = false,
  onTentarDeNovo,
  permitirLimpar = false,
  comOpcaoTodas = true,
}: SelectProps) {
  const chip = variante === "chip";
  /** Mesmo motivo do `MultiSelect`: com o menu controlado, o `onMenuClose`
   * que a lib dispara ao perder o foco não fecha o painel sozinho -- quem
   * fecha é escolher uma opção, o Esc ou o clique fora. */
  const [aberto, setAberto] = useState(false);
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
    // No `chip` o menu é controlado por nós, e quem o fechava no Escape era
    // o listener de `document` que acabamos de barrar.
    if (chip) fechar();
  }

  function escolher(novo: string) {
    onMudar(novo);
    fechar();
  }

  /** Quem filtra é o servidor. Isso muda três coisas de uma vez: a pílula
   * não trava enquanto carrega (é abrir que dispara a busca), o painel
   * mantém a lista anterior esmaecida em vez de esvaziar, e o filtro local
   * sai de cena pra não descartar resultado que o servidor achou por um
   * critério que o rótulo não mostra. */
  const remoto = Boolean(onBuscar);
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
  /* No padrão quem filtra é a lib (`filterOption` abaixo), então ela recebe
     a lista inteira; no chip o filtro já foi aplicado aqui. */
  const opcoesDoPainel = erro && remoto ? [] : chip ? opcoesVisiveis : opcoes;
  /** Onde a caixa de digitar fica, e a diferença não é de estilo.
   *
   * No CHIP o controle é a pílula: ela mostra o rótulo escolhido e tem
   * largura de rótulo, então digitar ali apagaria o texto e a faria pular de
   * tamanho a cada letra. A caixa vai pro painel
   * (`CampoDeBuscaDoPainel`).
   *
   * No PADRÃO o controle é um campo de formulário -- que é exatamente onde
   * se espera digitar. Aí quem cuida é o `isSearchable` da própria lib. */
  const buscaNoPainel = chip && (permitirBusca || remoto);
  const buscaNoControle = !chip && (permitirBusca || remoto);
  /** Não dá para mexer: desabilitado de fora, ou esperando a lista. */
  const travado = desabilitado || (carregando && !remoto);

  return (
    <ReactSelect<OpcaoDeSelect, false>
      unstyled
      inputId={id}
      options={opcoesDoPainel}
      /* ⚠️ Procura em `opcoes`, e NÃO em `opcoesVisiveis`: o valor escolhido
         some da lista filtrada assim que a pessoa digita outra coisa, e a
         pílula ficaria sem rótulo no meio da digitação. */
      value={opcoes.find((o) => o.value === valor) ?? null}
      /* `null` chega quando o X limpa -- ignorá-lo deixaria o botão inerte. */
      onChange={(opcao) => escolher(opcao?.value ?? "")}
      placeholder={carregando && !remoto ? "Carregando…" : placeholder}
      /* A caixa de digitar é nossa e mora no painel (`CampoDeBuscaDoPainel`);
         a da lib nasceria dentro da pílula. */
      /* 🔴 Travado NÃO pode ser pesquisável ao mesmo tempo: o `react-select`
         só renderiza o input quando `isSearchable`, e com ele desabilitado
         não renderiza nada -- some o `combobox` de que teclado e leitor de
         tela dependem para saber que existe um controle ali, esperando.
         Achado ao ligar a busca por padrão (28/08/2026); o teste
         "fica TRAVADO enquanto carrega" é quem cobra.

         ⚠️ E não se perde nada: não há o que filtrar numa lista que ainda
         não chegou. */
      isSearchable={buscaNoControle && !travado}
      /* ⚠️ Filtro PRÓPRIO, não o da lib: o dela compara texto cru, então
         "angela" não acharia "Ângela" -- e quem digita sem acento concluiria
         que o cliente não está cadastrado. Com `onBuscar` quem filtrou foi o
         servidor, e refiltrar aqui descartaria o que ele achou por critério
         que o rótulo não mostra (o CNPJ, por exemplo). */
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
      isDisabled={travado}
      isLoading={remoto && carregando && !erro}
      openMenuOnFocus
      menuPlacement="auto"
      menuPosition="fixed"
      maxMenuHeight={ALTURA_MAXIMA_MENU}
      menuPortalTarget={document.body}
      menuIsOpen={chip ? aberto : undefined}
      onMenuOpen={() => setAberto(true)}
      /* Só no `padrao`: no `chip` o menu é controlado, e deixar a lib
         fechá-lo no blur é justamente o defeito que o controle evita. Aqui
         `onMenuClose` serve só pra saber se o menu está aberto. */
      onMenuClose={chip ? undefined : () => setAberto(false)}
      onKeyDown={aoTeclar}
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
          ? { ...SEM_INDICADORES, Menu: MenuDeFiltro, ClearIndicator: BotaoDeLimpar }
          : {
              IndicatorSeparator: () => null,
              DropdownIndicator: SetaDoSelect,
              ClearIndicator: BotaoDeLimpar,
            }
      }
      {...(chip
        ? {
            rotuloTodas: placeholder,
            nenhumSelecionado: !valor,
            onTodas: () => escolher(""),
            comOpcaoTodas,
            onFechar: fechar,
            ...(buscaNoPainel
              ? { busca, onBusca: mudarBusca, placeholderBusca, ocultos: erro ? 0 : ocultos }
              : {}),
            erro,
            onTentarDeNovo,
            /* Só esmaece o que JÁ está na tela. Na primeira abertura não há
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
