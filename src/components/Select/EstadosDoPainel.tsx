import { Box, Button, Text } from "@chakra-ui/react";

/** A falha, com a saída DENTRO do painel.
 *
 * 🔴 **Nenhum painel mostra lista vazia sem dizer por quê.** Lista vazia
 * significa três coisas diferentes -- "ainda não chegou", "não deu pra
 * saber" e "não existe nenhuma" -- e quem lê precisa distinguir.
 *
 * A lição já está escrita em `useCatalogosDeProcesso`: sem separar as duas
 * primeiras, o modal anunciava "Crie um subgrupo primeiro" DURANTE o
 * carregamento, afirmando uma coisa falsa pra quem tem subgrupos. Num
 * painel que carrega sob demanda o risco volta, multiplicado pelas seis
 * pílulas.
 *
 * O aviso vem aqui e não num toast por dois motivos. Um toast por cima com
 * a lista vazia embaixo mostra duas informações contraditórias ao mesmo
 * tempo -- "falhou" e "não existe nenhum". E o toast some sozinho, deixando
 * a pessoa sem ação a não ser recarregar a página inteira; "Tentar de novo"
 * refaz só esta consulta.
 *
 * ⚠️ Vale também pras listas que vieram COM a página (fase, situação): elas
 * só parecem imunes. Aquela busca também pode ter falhado, e hoje o painel
 * delas oferece "Nenhuma" -- uma resposta errada.
 */
export function FalhaDoPainel({ onTentarDeNovo }: { onTentarDeNovo: () => void }) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      gap="9px"
      alignItems="center"
      p="14px 12px"
      borderBottomWidth="1px"
      borderBottomStyle="solid"
      borderBottomColor="border.subtle"
    >
      <Text fontSize="13px" fontWeight="600" color="status.bad">
        Não foi possível carregar a lista.
      </Text>
      <Button
        type="button"
        size="xs"
        variant="outline"
        fontSize="12.5px"
        fontWeight="700"
        borderColor="border"
        color="fg"
        _hover={{ bg: "bg.canvas" }}
        onClick={(e) => {
          /* ⚠️ O painel fecha ao clique de fora e o botão vive DENTRO dele;
             sem barrar a propagação, tentar de novo fechava o painel junto
             e a pessoa não via o resultado da tentativa. */
          e.stopPropagation();
          onTentarDeNovo();
        }}
      >
        Tentar de novo
      </Button>
    </Box>
  );
}

/** A faixa que aparece SOBRE a lista anterior enquanto a próxima vem.
 *
 * 🔴 Esmaece o resultado anterior em vez de esvaziar a lista: esvaziada, a
 * cada tecla o painel pisca do conteúdo pro vazio e de volta. Manter o
 * anterior esmaecido diz "isto aqui está velho" sem tirar da tela a única
 * referência que a pessoa tem -- é o mesmo raciocínio do
 * `keepPreviousData` que a tabela usa pra não remontar entre páginas.
 *
 * ⚠️ Só entra quando JÁ HÁ lista. Na primeira abertura não há nada pra
 * esmaecer, e aí quem fala é o "Carregando…" do próprio react-select. */
export function FaixaDeBusca() {
  return (
    <Box
      px="12px"
      py="5px"
      fontSize="12px"
      fontWeight="700"
      letterSpacing="0.03em"
      textTransform="uppercase"
      color="fg.muted"
      bg="bg.canvas"
      borderBottomWidth="1px"
      borderBottomStyle="solid"
      borderBottomColor="border.subtle"
    >
      Buscando…
    </Box>
  );
}
