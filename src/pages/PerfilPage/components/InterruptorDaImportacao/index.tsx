import { Box, Switch, Text } from "@chakra-ui/react";

import { Campo, Select } from "../../../../components";
import type { InterruptorDaImportacaoProps } from "./types";

/** O interruptor da importação automática, com o destino dos processos.
 *
 * 🔴 **Ligado é sobre CRIAR, não sobre VIGIAR** -- e é a distinção que o
 * texto de apoio precisa carregar, porque a tela tem as duas coisas a um
 * centímetro de distância. Com a inscrição cadastrada o sistema já acompanha
 * as movimentações; o interruptor faz ele CADASTRAR os processos novos.
 *
 * ⚠️ **O seletor só aparece com MAIS DE UM subgrupo.** Com um só, o destino é
 * óbvio e um seletor de uma opção é ruído -- mas a regra continua valendo por
 * baixo: liga, e o destino é aquele. Quem escolheu isso foi o usuário, em
 * 30/08/2026.
 *
 * ⚠️ **Um destino, embora o contrato seja lista.** O campo é `string[]` porque
 * a lista de avulsas do grupo permite vários -- lá um admin cadastra inscrição
 * de terceiro e pode espalhar. Aqui a pessoa escolhe onde os processos DELA
 * nascem, e a pergunta tem uma resposta só.
 */
export default function InterruptorDaImportacao({
  ligada,
  aoMudarLigada,
  subgrupos,
  destino,
  aoMudarDestino,
  temInscricao,
  desabilitado = false,
  deTerceiro = false,
  compacto = false,
}: InterruptorDaImportacaoProps) {
  const semSubgrupo = subgrupos.length === 0;
  const travado = desabilitado || !temInscricao || semSubgrupo;

  /* 🔴 O motivo é UM só, e a ordem importa: sem inscrição vem primeiro
     porque é o que a pessoa resolve ali mesmo, dois campos acima. Não
     participar de subgrupo nenhum ela não resolve sozinha. */
  const motivo = !temInscricao
    ? deTerceiro
      ? "Cadastre a inscrição acima para poder ligar."
      : "Cadastre sua inscrição acima para poder ligar."
    : semSubgrupo
      ? deTerceiro
        ? "Escolha ao menos um subgrupo acima para poder ligar."
        : "Você ainda não participa de nenhum subgrupo. Fale com um administrador."
      : null;

  return (
    <Box
      mt={compacto ? undefined : "20px"}
      pt="16px"
      borderTopWidth="1px"
      borderTopColor="border.subtle"
    >
      <Switch.Root
        checked={ligada}
        onCheckedChange={(e) => aoMudarLigada(e.checked)}
        disabled={travado}
      >
        {/* ⚠️ **Sem `role="switch"`, e isso foi MEDIDO, não presumido.**
            O Chakra v3 rende `<input type="checkbox">` com `aria-labelledby`
            -- nome acessível completo, papel `checkbox`. Pôr `role="switch"`
            parecia mais correto (é um interruptor, não uma caixa), e é o
            contrário: a ARIA exige `aria-checked` junto, o Chakra não o
            emite, e o estado passa a ser DESCONHECIDO. Medido: com o papel
            trocado, `toBeChecked()` deixa de reconhecer o elemento marcado.

            ➡️ Um checkbox que anuncia "marcado/desmarcado" é inteiramente
            usável; um switch de estado desconhecido é pior. Se um dia o
            Chakra emitir `aria-checked`, isto se revê. */}
        <Switch.HiddenInput />
        {/* 🔴 A cor da marca, explícita. O Chakra v3 pinta o trilho ligado de
            PRETO por padrão, e visto em Chrome real ele destoava de tudo à
            volta -- o sistema inteiro usa `brand` (#008fd5) para o estado
            ativo. Cor é contrato aqui: `theme/tokens.ts` registra que trocá-la
            obriga a alinhar o e-mail. */}
        <Switch.Control _checked={{ bg: "brand" }}>
          <Switch.Thumb />
        </Switch.Control>
        <Switch.Label fontSize="13px" fontWeight="600">
          Cadastrar automaticamente os processos novos
        </Switch.Label>
      </Switch.Root>

      {/* ⚠️ O apoio diz o que só ele diz: onde os processos vão parar. O que o
          interruptor já afirma no próprio rótulo não se repete aqui. */}
      <Box mt="6px" fontSize="11.5px" color="fg.subtle">
        Sem isto, o sistema apenas acompanha a inscrição. Ligado, ele cadastra
        os processos que o tribunal devolver
        {deTerceiro ? " para esta pessoa." : " para você."}
      </Box>

      {motivo && (
        <Text mt="6px" fontSize="11.5px" color="fg.muted">
          {motivo}
        </Text>
      )}

      {/* 🔴 Só com MAIS DE UM. Com um subgrupo o destino não é uma escolha, e
          oferecer um seletor de uma opção faz a pessoa procurar a decisão que
          ela teria de tomar. */}
      {ligada && subgrupos.length > 1 && (
        <Box mt="14px" maxW="320px">
          <Campo rotulo="Cadastrar em" para="destino-importacao-perfil">
            <Select
              id="destino-importacao-perfil"
              opcoes={subgrupos.map((s) => ({ value: s.id, label: s.nome }))}
              valor={destino}
              onMudar={aoMudarDestino}
              placeholder="Escolha o subgrupo"
              comOpcaoTodas={false}
              desabilitado={desabilitado}
            />
          </Campo>
        </Box>
      )}
    </Box>
  );
}
