import { DatePicker } from "@chakra-ui/react";

import { BotaoQuadrado } from "../BotaoQuadrado";
import { ESCONDE_A_VISTA_INATIVA } from "./traducoes";
import IconeSeta from "../Icons/IconeSeta";

/** As vistas de MÊS e de ANO do calendário.
 *
 * 🔴 **Existem porque o cabeçalho já prometia.** O `ViewTrigger` da vista de
 * dia é um botão que troca de vista; sem estas duas, clicar nele levava a
 * máquina para uma vista que ninguém renderizava, o Chakra formatava uma
 * data não-finita e a TELA CAÍA -- `RangeError: date value is not finite in
 * DateTimeFormat format()`. Achado pelo usuário no modal de conta do
 * Financeiro, mas valia para toda tela com campo de data.
 *
 * ⚠️ Ficam em arquivo próprio, ao lado do `Gatilho`, para o `index` não
 * passar da régua de arquivos menores: as três vistas juntas passariam de
 * 250 linhas de código.
 *
 * ⚠️ Meses em 3 colunas com o nome INTEIRO, anos em 4. "Fevereiro" cabe nos
 * 88px que sobram de três colunas, e "fev." economizaria espaço que não
 * falta -- o painel tem 264px e a grade de dia já usa sete colunas.
 *
 * ➡️ `index.test.tsx`.
 */
export default function VistasDeMesEAno() {
  return (
    <>
      <DatePicker.View view="month" css={ESCONDE_A_VISTA_INATIVA}>
        <DatePicker.Context>
          {(api) => (
            <>
              <Cabecalho rotuloAnterior="Ano anterior" rotuloProximo="Próximo ano" />
              <DatePicker.Table borderCollapse="separate" borderSpacing="2px" width="100%">
                <DatePicker.TableBody>
                  {api.getMonthsGrid({ columns: 3, format: "long" }).map((linha, i) => (
                    <DatePicker.TableRow key={i}>
                      {linha.map((mes) => (
                        <DatePicker.TableCell key={mes.value} value={mes.value} p="0">
                          <CelulaDeEscolha>{mes.label}</CelulaDeEscolha>
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

      <DatePicker.View view="year" css={ESCONDE_A_VISTA_INATIVA}>
        <DatePicker.Context>
          {(api) => (
            <>
              <Cabecalho rotuloAnterior="Década anterior" rotuloProximo="Próxima década" />
              <DatePicker.Table borderCollapse="separate" borderSpacing="2px" width="100%">
                <DatePicker.TableBody>
                  {api.getYearsGrid({ columns: 4 }).map((linha, i) => (
                    <DatePicker.TableRow key={i}>
                      {linha.map((ano) => (
                        <DatePicker.TableCell key={ano.value} value={ano.value} p="0">
                          <CelulaDeEscolha>{ano.label}</CelulaDeEscolha>
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
    </>
  );
}

/** O mesmo cabeçalho da vista de dia -- setas e o botão que sobe de vista.
 *
 * ⚠️ Os rótulos das setas MUDAM com a vista ("Mês anterior" na de dia, "Ano
 * anterior" na de mês): quem navega por leitor de tela precisa saber o que o
 * botão anda, e um rótulo genérico mentiria em duas das três. */
function Cabecalho({
  rotuloAnterior,
  rotuloProximo,
}: {
  rotuloAnterior: string;
  rotuloProximo: string;
}) {
  return (
    <DatePicker.ViewControl
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      mb="8px"
    >
      <DatePicker.PrevTrigger asChild>
        <BotaoQuadrado type="button" tamanho="compacto" aria-label={rotuloAnterior}>
          <IconeSeta />
        </BotaoQuadrado>
      </DatePicker.PrevTrigger>
      <DatePicker.ViewTrigger
        fontSize="13px"
        fontWeight="800"
        css={{ "&::first-letter": { textTransform: "uppercase" } }}
      >
        <DatePicker.RangeText />
      </DatePicker.ViewTrigger>
      <DatePicker.NextTrigger asChild>
        <BotaoQuadrado
          type="button"
          tamanho="compacto"
          aria-label={rotuloProximo}
          transform="scaleX(-1)"
        >
          <IconeSeta />
        </BotaoQuadrado>
      </DatePicker.NextTrigger>
    </DatePicker.ViewControl>
  );
}

/** A célula clicável de mês e de ano.
 *
 * ⚠️ **Estiliza o `TableCellTrigger` DIRETO, sem `asChild`.** Com `asChild` +
 * um botão nosso, o clique não trocava de vista: escolher 2024 deixava a
 * grade de anos na tela. É o mesmo caminho que a vista de dia já usava.
 *
 * ⚠️ A maiúscula do mês é `::first-letter`, e não `textTransform:
 * capitalize`: o nome vem em minúscula do `pt-BR` ("agosto"), e capitalizar
 * a palavra inteira não muda o NOME ACESSÍVEL -- quem lê por leitor de tela
 * ouve o mesmo, e quem vê lê "Agosto". */
function CelulaDeEscolha({ children }: { children: React.ReactNode }) {
  return (
    <DatePicker.TableCellTrigger
      style={{ width: "100%", minWidth: 0, height: "34px" }}
      borderRadius="sm"
      fontSize="12.5px"
      fontWeight="600"
      color="fg"
      cursor="pointer"
      justifyContent="center"
      css={{ "&::first-letter": { textTransform: "uppercase" } }}
      _hover={{ bg: "border.subtle" }}
      _selected={{ bg: "fg.brand", color: "white" }}
    >
      {children}
    </DatePicker.TableCellTrigger>
  );
}
