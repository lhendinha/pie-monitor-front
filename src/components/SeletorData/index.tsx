import { Box, DatePicker, Portal, parseDate } from "@chakra-ui/react";

import { SELETOR_CALENDARIO, Z_INDEX_CALENDARIO } from "../../constants/camadaFlutuante";

import { formatarData } from "../../utils";
import { BotaoQuadrado } from "../BotaoQuadrado";
import IconeCalendario from "../Icons/IconeCalendario";
import IconeSeta from "../Icons/IconeSeta";
import { Gatilho } from "./Gatilho";
import type { SeletorDataProps } from "./types";

/** Seletor de data com o calendário do Chakra (`DatePicker`).
 *
 * Estava escrito à mão até 21/08 e foi substituído: o componente da lib traz
 * o que a versão caseira não tinha e é caro fazer certo -- navegação por
 * setas, Home/End, PageUp/PageDown e os papéis ARIA de grade. Calendário sem
 * isso é inacessível pra quem não usa mouse.
 *
 * O visual segue os tokens do artifact; o comportamento é da lib.
 *
 * O valor entra e sai como `aaaa-mm-dd` (`valueAsString`), que é o formato
 * que a API usa -- nada de objeto de data atravessando a fronteira.
 */
export default function SeletorData({
  id,
  rotuladoPor,
  valor,
  onMudar,
  placeholder = "Escolher data",
  aberto,
  onAbertura,
}: SeletorDataProps) {
  // `parseDate` faz a ponte: a lib trabalha com `DateValue`, e pra fora
  // este componente segue falando `aaaa-mm-dd`, que é o formato da API --
  // objeto de data não atravessa essa fronteira.
  /** Escape com o calendário ABERTO fecha só o calendário.
   *
   * 🔴 Mesmo defeito dos dois `Select`, aqui pelo `DatePicker` do Chakra:
   * `Modal` escuta `keydown` no `document`, então um Escape com o
   * calendário aberto fechava o formulário inteiro junto -- levando o texto
   * já digitado. Apareceu em Chrome, e jsdom reproduz: há teste em
   * `SeletorData/index.test.tsx`.
   *
   * ⚠️ A pergunta "está aberto?" é respondida pelo DOM, e não por estado.
   * Tentei primeiro com estado alimentado por `onOpenChange`, e no Escape
   * ele ainda vinha `false` -- sondado em Chrome. `SELETOR_CALENDARIO` é a
   * marca que a própria lib escreve no conteúdo, já usada no projeto pra
   * esta mesma pergunta, e com `unmountOnExit` ela só existe enquanto o
   * calendário está aberto de fato. */
  function aoTeclar(evento: React.KeyboardEvent) {
    if (evento.key !== "Escape") return;
    if (!document.querySelector(SELETOR_CALENDARIO)) return;
    evento.stopPropagation();
  }

  return (
    <Box id={id} onKeyDown={aoTeclar}>
      <DatePicker.Root
        /* ⚠️ Fechado, o calendário tem que sair do DOM. Sem isto o
         posicionador dele continua montado por cima da tela e ENGOLE
         cliques -- o campo de baixo virava inclicável e o painel parecia
         não reagir a clique nenhum. */
        lazyMount
        unmountOnExit
        open={aberto}
        onOpenChange={(e) => onAbertura?.(e.open)}
        locale="pt-BR"
        startOfWeek={0}
        value={valor ? [parseDate(valor)] : []}
        /** ⚠️ `value[0].toString()`, e NÃO `valueAsString`: este último vem
         * formatado pelo `locale` (dia/mês/ano), e o valor sai daqui pra
         * API, que fala `aaaa-mm-dd`. Guardando o texto localizado, o
         * `parseDate` do render seguinte lançava
         * "Invalid ISO 8601 date string" e derrubava a tela inteira -- a
         * página ficava em branco ao escolher uma data. */
        onValueChange={(e) => onMudar(e.value[0]?.toString() ?? "")}
        positioning={{ sameWidth: false }}
      >
        {/* `width: 100%` aqui e não só no gatilho: o `Control` do Chakra vem
          com largura de conteúdo, e o botão dentro dele não tinha o que
          preencher -- o campo encolhia até o texto quebrar em duas linhas e
          o ícone virar um risco. */}
        <DatePicker.Control width="100%">
          <Gatilho type="button" vazio={!valor} aria-labelledby={rotuladoPor}>
            <IconeCalendario />
            {valor ? formatarData(valor) : placeholder}
          </Gatilho>
        </DatePicker.Control>

        <Portal>
          {/* ⚠️ NADA de `style` inline aqui: é neste elemento que o motor de
            posicionamento escreve `transform`/`top`/`left`, e passar `style`
            apaga tudo -- o calendário ia parar no canto da tela (0,0). */}
          <DatePicker.Positioner>
            {/* ⚠️ Quem abre este calendário DENTRO de outro painel flutuante
              precisa declará-lo como parte dele (ver `SELETOR_CALENDARIO`):
              como o conteúdo é portalado, o clique num dia chega ao painel
              de baixo como "clique fora" e o fecha. */}
            <DatePicker.Content
              /* ⚠️ `position: relative` junto do `zIndex`: a lib já põe um
               z-index aqui, mas num elemento `position: static`, onde ele
               não faz efeito nenhum -- quem ficava na frente era a ordem do
               DOM, e o calendário aparecia ATRÁS do painel de filtro. */
              position="relative"
              zIndex={Z_INDEX_CALENDARIO}
              w="264px"
              /* ⚠️ `minW` junto: a receita do Chakra impõe `min-width: 288px`
               e vencia a largura de 264px do artifact -- a grade de 7
               colunas passava da borda e a última coluna ficava cortada. */
              minW="264px"
              p="12px"
              borderRadius="md"
              boxShadow="md"
            >
              <DatePicker.View view="day" width="100%" minW="0">
                <DatePicker.Context>
                  {(api) => (
                    <>
                      <DatePicker.ViewControl
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        mb="8px"
                      >
                        <DatePicker.PrevTrigger asChild>
                          <BotaoQuadrado
                            type="button"
                            tamanho="compacto"
                            aria-label="Mês anterior"
                          >
                            <IconeSeta />
                          </BotaoQuadrado>
                        </DatePicker.PrevTrigger>
                        <DatePicker.ViewTrigger
                          fontSize="13px"
                          fontWeight="800"
                          textTransform="capitalize"
                        >
                          <DatePicker.RangeText />
                        </DatePicker.ViewTrigger>
                        <DatePicker.NextTrigger asChild>
                          {/* Mesma seta espelhada, como no artifact. */}
                          <BotaoQuadrado
                            type="button"
                            tamanho="compacto"
                            aria-label="Próximo mês"
                            transform="scaleX(-1)"
                          >
                            <IconeSeta />
                          </BotaoQuadrado>
                        </DatePicker.NextTrigger>
                      </DatePicker.ViewControl>

                      {/* `fixed` + `borderSpacing`: reproduz o
                        `grid-template-columns: repeat(7,1fr); gap:2px` do
                        artifact sem abrir mão da marcação de tabela, que é
                        de onde vêm os papéis ARIA de grade. */}
                      <DatePicker.Table
                        borderCollapse="separate"
                        borderSpacing="2px"
                        /* ⚠️ `style` inline, e não prop do Chakra: a receita
                         do `DatePicker` fixa a largura da tabela e a das
                         células (40px cada), e prop de estilo perde pra ela
                         nesta parte. Com 7 colunas de 40px a grade dava
                         296px dentro de um painel de 264px -- a última
                         coluna ficava cortada. Inline vence qualquer
                         camada. */
                        style={{ width: "100%", tableLayout: "fixed" }}
                      >
                        <DatePicker.TableHead>
                          <DatePicker.TableRow>
                            {api.weekDays.map((dia) => (
                              <DatePicker.TableHeader
                                key={dia.short}
                                fontSize="10px"
                                fontWeight="700"
                                color="fg.subtle"
                                textAlign="center"
                                py="4px"
                                /* Com `table-layout: fixed` são as células da
                                 PRIMEIRA linha que definem a largura das
                                 colunas -- e as da lib vinham com 40px
                                 fixos, o que estourava o painel. Um sétimo
                                 cada, e a grade passa a caber. */
                                style={{ width: "14.2857%", minWidth: 0 }}
                              >
                                {dia.narrow}
                              </DatePicker.TableHeader>
                            ))}
                          </DatePicker.TableRow>
                        </DatePicker.TableHead>
                        <DatePicker.TableBody>
                          {api.weeks.map((semana, i) => (
                            <DatePicker.TableRow key={i}>
                              {semana.map((dia, j) => (
                                <DatePicker.TableCell key={j} value={dia} p="0">
                                  <DatePicker.TableCellTrigger
                                    /* Quadrado de verdade: a receita fixa
                                     40x40 e ganha das props, então largura,
                                     altura e proporção vão inline. */
                                    style={{
                                      width: "100%",
                                      minWidth: 0,
                                      height: "auto",
                                      minHeight: 0,
                                      aspectRatio: "1",
                                    }}
                                    borderRadius="sm"
                                    fontSize="12.5px"
                                    fontWeight="600"
                                    color="fg"
                                    cursor="pointer"
                                    _hover={{ bg: "border.subtle" }}
                                    _selected={{
                                      bg: "fg.brand",
                                      color: "white",
                                    }}
                                    data-outside-range-style="1"
                                    css={{
                                      "&[data-outside-range]": {
                                        color: "fg.subtle",
                                        opacity: 0.45,
                                      },
                                    }}
                                    /* Hoje é só o anel do artifact; a receita ainda sublinha o
                                     número, o que vira ruído dentro do anel. */
                                    _today={{
                                      boxShadow:
                                        "inset 0 0 0 1.5px var(--chakra-colors-brand)",
                                      textDecoration: "none",
                                    }}
                                  >
                                    {dia.day}
                                  </DatePicker.TableCellTrigger>
                                </DatePicker.TableCell>
                              ))}
                            </DatePicker.TableRow>
                          ))}
                        </DatePicker.TableBody>
                      </DatePicker.Table>
                    </>
                  )}
                </DatePicker.Context>
              </DatePicker.View>
            </DatePicker.Content>
          </DatePicker.Positioner>
        </Portal>
      </DatePicker.Root>
    </Box>
  );
}
