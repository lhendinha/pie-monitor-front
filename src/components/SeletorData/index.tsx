import { DatePicker, Portal, parseDate } from "@chakra-ui/react";

import { formatarData } from "../../utils";
import { Gatilho } from "./Gatilho";

interface Props {
  id: string;
  valor: string;
  onMudar: (iso: string) => void;
  placeholder?: string;
}

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
export default function SeletorData({ id, valor, onMudar, placeholder = "Escolher data" }: Props) {
  // `parseDate` faz a ponte: a lib trabalha com `DateValue`, e pra fora
  // este componente segue falando `aaaa-mm-dd`, que é o formato da API --
  // objeto de data não atravessa essa fronteira.
  return (
    <DatePicker.Root
      locale="pt-BR"
      startOfWeek={0}
      value={valor ? [parseDate(valor)] : []}
      onValueChange={(e) => onMudar(e.valueAsString[0] ?? "")}
      positioning={{ sameWidth: false }}
    >
      <DatePicker.Control>
        <DatePicker.Trigger asChild>
          <Gatilho id={id} type="button">
            {valor ? formatarData(valor) : placeholder}
          </Gatilho>
        </DatePicker.Trigger>
      </DatePicker.Control>

      <Portal>
        <DatePicker.Positioner>
          <DatePicker.Content w="264px" p="12px" borderRadius="md" boxShadow="md">
            <DatePicker.View view="day">
              <DatePicker.Context>
                {(api) => (
                  <>
                    <DatePicker.ViewControl
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      mb="8px"
                    >
                      <DatePicker.PrevTrigger aria-label="Mês anterior" px="6px">
                        ‹
                      </DatePicker.PrevTrigger>
                      <DatePicker.ViewTrigger
                        fontSize="13px"
                        fontWeight="800"
                        textTransform="capitalize"
                      >
                        <DatePicker.RangeText />
                      </DatePicker.ViewTrigger>
                      <DatePicker.NextTrigger aria-label="Próximo mês" px="6px">
                        ›
                      </DatePicker.NextTrigger>
                    </DatePicker.ViewControl>

                    <DatePicker.Table width="100%">
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
                              <DatePicker.TableCell key={j} value={dia} p="1px">
                                <DatePicker.TableCellTrigger
                                  aspectRatio="1"
                                  width="100%"
                                  borderRadius="sm"
                                  fontSize="12.5px"
                                  fontWeight="600"
                                  color="fg.default"
                                  cursor="pointer"
                                  _hover={{ bg: "border.subtle" }}
                                  _selected={{ bg: "fg.brand", color: "white" }}
                                  data-outside-range-style="1"
                                  css={{
                                    "&[data-outside-range]": { color: "fg.subtle", opacity: 0.45 },
                                  }}
                                  _today={{ boxShadow: "inset 0 0 0 1.5px var(--chakra-colors-brand)" }}
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
  );
}
