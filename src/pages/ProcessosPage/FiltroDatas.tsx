import { Box, Button, Popover, Portal, Stack } from "@chakra-ui/react";

import { Rotulo, SeletorData } from "../../components";
import { PILULA, coresPilula } from "../../theme/pilula";
import { formatarData } from "../../utils";

interface Props {
  dataVerificarAte: string;
  prazoFinalAte: string;
  onMudar: (parcial: { dataVerificarAte?: string; prazoFinalAte?: string }) => void;
}

/** As duas datas atrás de um chip só, como no artifact.
 *
 * É `Popover` e não menu porque o conteúdo é interativo: dois calendários
 * que precisam receber clique sem fechar o painel a cada interação.
 */
export default function FiltroDatas({ dataVerificarAte, prazoFinalAte, onMudar }: Props) {
  const ativo = Boolean(dataVerificarAte || prazoFinalAte);
  const cor = coresPilula(ativo);

  /** Com as duas preenchidas o rótulo não cabe na pílula, então mostra a
   * primeira e sinaliza que há outra. */
  const rotulo = !ativo
    ? "Datas"
    : dataVerificarAte && prazoFinalAte
      ? `${formatarData(dataVerificarAte)} +1`
      : formatarData(dataVerificarAte || prazoFinalAte);

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button
          type="button"
          display="inline-flex"
          alignItems="center"
          gap={PILULA.gap}
          h="auto"
          px={PILULA.paddingX}
          py={PILULA.paddingY}
          borderRadius={PILULA.raio}
          borderWidth="1px"
          borderColor={cor.borda}
          bg={cor.fundo}
          color={cor.texto}
          fontWeight={PILULA.peso}
          fontSize={PILULA.fonte}
          letterSpacing={PILULA.espacamento}
          textTransform="uppercase"
          whiteSpace="nowrap"
          _hover={{ borderColor: "fg.brand" }}
        >
          {rotulo}
          <span aria-hidden="true">▾</span>
        </Button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content w="250px" p="10px 12px">
            <Stack gap="12px">
              <Box>
                <Rotulo htmlFor="filtro-verificar">Data p/ verificar (até)</Rotulo>
                <Box mt="6px">
                  <SeletorData
                    id="filtro-verificar"
                    valor={dataVerificarAte}
                    onMudar={(v) => onMudar({ dataVerificarAte: v })}
                    placeholder="Qualquer data"
                  />
                </Box>
              </Box>
              <Box>
                <Rotulo htmlFor="filtro-prazo">Prazo final (até)</Rotulo>
                <Box mt="6px">
                  <SeletorData
                    id="filtro-prazo"
                    valor={prazoFinalAte}
                    onMudar={(v) => onMudar({ prazoFinalAte: v })}
                    placeholder="Qualquer data"
                  />
                </Box>
              </Box>
              {ativo && (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => onMudar({ dataVerificarAte: "", prazoFinalAte: "" })}
                >
                  Limpar datas
                </Button>
              )}
            </Stack>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}
