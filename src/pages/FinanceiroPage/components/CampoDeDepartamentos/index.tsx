import { Box, Flex, Stack, Text } from "@chakra-ui/react";

import BotaoDeTexto from "../../../../components/BotaoDeTexto";
import CampoDeValor from "../../../../components/CampoDeValor";
import { Select } from "../../../../components/Select";
import { MAXIMO_DE_DEPARTAMENTOS_NO_RATEIO } from "../../../../constants";
import { useNomeDeSubgrupo } from "../../../../hooks/useNomeDeSubgrupo";
import { useSubgruposBuscaveis } from "../../../../hooks/useSubgruposBuscaveis";
import { comOpcoesEscolhidas } from "../../../../utils/opcoesEscolhidas";
import { formatarCentavos } from "../../../../utils";
import type { CampoDeDepartamentosProps } from "./types";

/** O departamento do lançamento -- um, ou vários com o valor de cada.
 *
 * 🔴 **Um select, no caminho comum.** É o que a Fase 5 do plano pede, e é o
 * que quase todo lançamento é. A divisão fica atrás de um link porque
 * mostrar duas colunas de valor para quem tem um departamento só cobraria
 * uma decisão que ninguém tem.
 *
 * 🔴 **Mas a divisão precisa existir na tela.** Um processo vive em vários
 * subgrupos, e isso "vai ser comum" -- é a razão de o departamento ser
 * rateio e não campo. Sem esta parte, o rateio que a API guarda seria
 * inalcançável por quem usa o sistema.
 *
 * ⚠️ **Com UMA linha, o valor não é digitado nem enviado.** Ele só pode ser
 * o do lançamento; pedir o número de novo faria a tela mandar a mesma coisa
 * duas vezes, com um 400 esperando o dia em que as duas discordassem. O
 * schema aceita a parcela única sem `valor_centavos` justamente por isso.
 *
 * ➡️ `../../index.test.tsx` e os testes dos modais.
 */
export default function CampoDeDepartamentos({
  id, valor, onMudar, valorTotalCentavos,
}: CampoDeDepartamentosProps) {
  const subgrupos = useSubgruposBuscaveis(true);
  const nomeDeSubgrupo = useNomeDeSubgrupo();
  const dividido = valor.length > 1;

  /** 🔴 O departamento JÁ ESCOLHIDO entra na lista mesmo fora da primeira
   * página da busca. Sem isto o campo aparecia VAZIO num lançamento que tem
   * rateio -- visto na tela: um escritório com sessenta subgrupos, e o do
   * rateio na segunda página. É o mesmo defeito que `comOpcaoEscolhida`
   * conserta no campo de cliente, e a razão é a mesma: o select desenha o
   * rótulo procurando o id entre as opções carregadas.
   *
   * ⚠️ O nome vem de `useNomeDeSubgrupo`, que percorre TODAS as páginas numa
   * ida só e é compartilhado com as outras sete telas -- não custa consulta
   * nova. */
  const escolhidos = valor.map((p) => p.subgrupo_id).filter(Boolean);
  const opcoes = comOpcoesEscolhidas(
    subgrupos.opcoes,
    escolhidos,
    Object.fromEntries(escolhidos.map((id) => [id, nomeDeSubgrupo(id)])),
  );

  const somado = valor.reduce((t, p) => t + (p.valor_centavos ?? 0), 0);
  const total = valorTotalCentavos ?? 0;
  const falta = total - somado;

  function trocarSubgrupo(indice: number, subgrupoId: string) {
    onMudar(valor.map((p, i) => (i === indice ? { ...p, subgrupo_id: subgrupoId } : p)));
  }

  function trocarValor(indice: number, centavos: number | null) {
    onMudar(
      valor.map((p, i) => (i === indice ? { ...p, valor_centavos: centavos ?? 0 } : p)),
    );
  }

  /** Abre a divisão: o departamento que já estava fica com o valor inteiro,
   * e a segunda linha nasce vazia.
   *
   * ⚠️ Dar o total ao primeiro (em vez de dividir ao meio) é o que mantém a
   * soma fechada enquanto a pessoa ainda não decidiu -- ela tira do primeiro
   * e põe no segundo, e o "falta" só aparece no meio do caminho. */
  function dividir() {
    onMudar([
      { subgrupo_id: valor[0]?.subgrupo_id ?? "", valor_centavos: total },
      { subgrupo_id: "", valor_centavos: 0 },
    ]);
  }

  function remover(indice: number) {
    const restantes = valor.filter((_, i) => i !== indice);
    /* Voltou a UM: o valor sai junto -- ver o comentário do topo. */
    onMudar(
      restantes.length === 1
        ? [{ subgrupo_id: restantes[0].subgrupo_id }]
        : restantes,
    );
  }

  if (!dividido) {
    return (
      <Stack gap="6px">
        <Select
          id={id}
          opcoes={opcoes}
          valor={valor[0]?.subgrupo_id ?? ""}
          onMudar={(v) => trocarSubgrupo(0, v)}
          onBuscar={subgrupos.buscar}
          carregando={subgrupos.carregando}
          erro={subgrupos.erro}
          onTentarDeNovo={subgrupos.tentarDeNovo}
          placeholder="Escolha o departamento"
        />
        <Box>
          <BotaoDeTexto onClick={dividir}>Dividir entre departamentos</BotaoDeTexto>
        </Box>
      </Stack>
    );
  }

  return (
    <Stack gap="8px">
      {valor.map((parcela, i) => (
        <Flex key={i} gap="8px" align="center">
          <Box flex="1" minW="0">
            <Select
              id={i === 0 ? id : `${id}-${i}`}
              opcoes={opcoes}
              valor={parcela.subgrupo_id}
              onMudar={(v) => trocarSubgrupo(i, v)}
              onBuscar={subgrupos.buscar}
              carregando={subgrupos.carregando}
              erro={subgrupos.erro}
              onTentarDeNovo={subgrupos.tentarDeNovo}
              placeholder="Escolha o departamento"
            />
          </Box>
          <Box w="140px" flex="none">
            <CampoDeValor
              id={`${id}-valor-${i}`}
              valor={parcela.valor_centavos ?? null}
              onMudar={(c) => trocarValor(i, c)}
            />
          </Box>
          <BotaoDeTexto onClick={() => remover(i)}>Remover</BotaoDeTexto>
        </Flex>
      ))}

      <Flex justify="space-between" align="center" gap="10px" wrap="wrap">
        {valor.length < MAXIMO_DE_DEPARTAMENTOS_NO_RATEIO && (
          <BotaoDeTexto
            onClick={() => onMudar([...valor, { subgrupo_id: "", valor_centavos: 0 }])}
          >
            Adicionar departamento
          </BotaoDeTexto>
        )}
        {/* 🔴 O que FALTA, e não só "a soma não bate": quem está dividindo
            R$ 10.000 precisa do número que ainda tem para distribuir, não de
            um aviso de que errou. Some quando fecha. */}
        {falta !== 0 && (
          <Text fontSize="12px" fontWeight="700" color={falta > 0 ? "fg.muted" : "status.bad"}>
            {falta > 0
              ? `Falta distribuir R$ ${formatarCentavos(falta)}`
              : `Passou R$ ${formatarCentavos(-falta)} do valor do lançamento`}
          </Text>
        )}
      </Flex>
    </Stack>
  );
}
