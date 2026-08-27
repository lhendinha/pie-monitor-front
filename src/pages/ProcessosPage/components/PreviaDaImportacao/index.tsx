import { useMemo, useState } from "react";
import { Box, Checkbox, Flex, Progress, Text } from "@chakra-ui/react";

import { Botao, BotaoDeTexto, Campo, CampoDeResponsaveis } from "../../../../components";
import { mascararNumeroProcesso } from "../../../../utils";
import { rotuloDeImportar, selecionaveis } from "../../../../utils/importacao";
import type { PreviaDaImportacao as Previa } from "../../../../types";

interface PreviaDaImportacaoProps {
  previa: Previa;
  subgrupoId: string;
  /** Quem está importando. É a pré-seleção do responsável -- e o único valor
   * seguro quando ela não é membro do subgrupo. */
  meuEmail: string;
  /** 🔴 Se quem importa NÃO é membro do subgrupo escolhido, o servidor recusa
   * pô-la como responsável (`Responsável não é membro do subgrupo`) -- e um
   * `manager`/`admin` age em subgrupo que não participa. Sem esta informação
   * a tela pré-selecionaria alguém que a API vai negar, e a importação
   * inteira falharia depois da busca. */
  souMembro: boolean;
  importando: boolean;
  progresso: { feitos: number; total: number } | null;
  onImportar: (numeros: string[], responsaveis: string[]) => void;
  onVoltar: () => void;
}

/** A lista para conferir antes de gravar.
 *
 * 🔴 **Existe porque 201 processos cadastrados por engano são 201 que alguém
 * apaga um a um.** É o único ponto em que ainda é barato desfazer.
 */
export default function PreviaDaImportacao({
  previa,
  subgrupoId,
  meuEmail,
  souMembro,
  importando,
  progresso,
  onImportar,
  onVoltar,
}: PreviaDaImportacaoProps) {
  const disponiveis = useMemo(() => selecionaveis(previa.processos), [previa.processos]);
  const [marcados, setMarcados] = useState<Set<string>>(() => new Set(disponiveis));
  const [responsaveis, setResponsaveis] = useState<string[]>(souMembro ? [meuEmail] : []);

  const jaExistem = previa.processos.length - disponiveis.length;

  function alternar(numero: string) {
    setMarcados((atual) => {
      const novo = new Set(atual);
      if (novo.has(numero)) novo.delete(numero);
      else novo.add(numero);
      return novo;
    });
  }

  return (
    <Box>
      <Flex gap="12px" mb="16px" flexWrap="wrap">
        <Resumo numero={previa.processos.length} rotulo="encontrados" />
        <Resumo numero={jaExistem} rotulo="já cadastrados" tom="fg.muted" />
        <Resumo numero={disponiveis.length} rotulo="novos" tom="fg.success" />
      </Flex>

      {previa.atingiu_o_teto && (
        <Box
          mb="16px"
          p="14px 16px"
          bg="bg.warning"
          border="1px solid"
          borderColor="border.warning"
          borderRadius="10px"
        >
          <Text fontSize="14px" fontWeight="800" mb="4px">
            Esta OAB tem processos demais para uma busca só.
          </Text>
          <Text fontSize="13px" color="fg.muted">
            Trouxemos {previa.processos.length} deles. Para alcançar o restante,
            busque por período — um ano de cada vez, por exemplo.
          </Text>
          {/* ⚠️ O caminho de volta fica AQUI, junto do aviso: mandar a pessoa
              procurar o campo de período na tela anterior seria dizer o
              problema sem dizer a saída. */}
          <Box mt="10px">
            <BotaoDeTexto onClick={onVoltar}>Escolher um período →</BotaoDeTexto>
          </Box>
        </Box>
      )}

      <Campo
        rotulo="Quem responde por estes processos"
        para="responsaveis-importacao"
        dica={
          souMembro
            ? "Quem responde recebe os avisos de movimentação."
            : /* 🔴 A frase diz o PORQUÊ, não só o que fazer: sem isso a
                 pessoa tentaria se escolher e não se acharia na lista. */
              "Você não é membro deste subgrupo, então precisa escolher quem responde entre os membros dele."
        }
      >
        <CampoDeResponsaveis
          id="responsaveis-importacao"
          subgrupoId={subgrupoId}
          valor={responsaveis}
          onMudar={setResponsaveis}
        />
      </Campo>

      {/* ⚠️ Trava junto com a lista, e pelo mesmo motivo: mudar a seleção no
          meio da gravação mexeria no contador sem mexer no que já está sendo
          gravado. `BotaoDeTexto` não tem `disabled` -- e alargá-lo por causa
          desta tela mudaria um componente que oito outras usam. */}
      <Flex
        gap="10px"
        alignItems="center"
        mb="8px"
        mt="12px"
        flexWrap="wrap"
        opacity={importando ? 0.55 : 1}
        pointerEvents={importando ? "none" : "auto"}
      >
        <BotaoDeTexto onClick={() => setMarcados(new Set(disponiveis))}>
          Marcar todos
        </BotaoDeTexto>
        <BotaoDeTexto onClick={() => setMarcados(new Set())}>
          Desmarcar todos
        </BotaoDeTexto>
        <Text fontSize="13px" color="fg.muted">
          {marcados.size} de {disponiveis.length} marcados
        </Text>
      </Flex>

      {/* ⚠️ Durante a gravação a lista inteira trava: desmarcar no meio
          mudaria o contador sem mudar o que está sendo gravado. */}
      <Box
        as="ul"
        listStyleType="none"
        border="1px solid"
        borderColor="border"
        borderRadius="10px"
        maxH="420px"
        overflowY="auto"
        opacity={importando ? 0.55 : 1}
        pointerEvents={importando ? "none" : "auto"}
      >
        {previa.processos.map((p) => (
          <Flex
            as="li"
            key={p.numero_processo}
            gap="12px"
            p="10px 14px"
            borderBottom="1px solid"
            borderColor="border.subtle"
            alignItems="center"
            /* O alvo do mouse é a linha inteira, não só a caixa -- e por isso
               o cursor de recusa também é dela. Mesmo padrão de
               `CampoDeArquivo`. */
            cursor={p.ja_existe ? "not-allowed" : "pointer"}
            onClick={() => !p.ja_existe && alternar(p.numero_processo)}
          >
            <Checkbox.Root
              checked={marcados.has(p.numero_processo)}
              disabled={p.ja_existe}
              aria-label={`Importar ${p.apelido}`}
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
            </Checkbox.Root>
            <Box flex="1" minW={0}>
              <Text fontSize="13.5px" fontWeight="600" truncate>
                {p.apelido}
              </Text>
              <Text fontSize="12px" color="fg.muted" fontFamily="mono">
                {mascararNumeroProcesso(p.numero_processo)}
              </Text>
            </Box>
            <Text fontSize="12px" color="fg.muted" flexShrink={0}>
              {p.comunicacoes}{" "}
              {p.comunicacoes === 1 ? "comunicação" : "comunicações"}
            </Text>
            {p.ja_existe && (
              <Text fontSize="12px" color="fg.muted" flexShrink={0}>
                já cadastrado
              </Text>
            )}
          </Flex>
        ))}
      </Box>

      {progresso && importando && (
        <Box mt="14px">
          <Progress.Root
            value={progresso.total ? (progresso.feitos / progresso.total) * 100 : null}
            size="sm"
          >
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
          <Text fontSize="12px" color="fg.muted" mt="6px">
            {progresso.feitos} de {progresso.total} cadastrados
          </Text>
        </Box>
      )}

      <Flex gap="9px" mt="16px" flexWrap="wrap">
        <Botao
          loading={importando}
          disabled={marcados.size === 0}
          onClick={() => onImportar([...marcados], responsaveis)}
        >
          {rotuloDeImportar(marcados.size)}
        </Botao>
        <Botao variante="ghost" onClick={onVoltar} disabled={importando}>
          Voltar
        </Botao>
      </Flex>
    </Box>
  );
}

function Resumo({ numero, rotulo, tom }: { numero: number; rotulo: string; tom?: string }) {
  return (
    <Box
      flex="1"
      minW="140px"
      p="14px 16px"
      border="1px solid"
      borderColor="border"
      borderRadius="10px"
    >
      <Text fontSize="24px" fontWeight="800" lineHeight="1.1" color={tom}>
        {numero}
      </Text>
      <Text fontSize="12.5px" color="fg.muted" mt="2px">
        {rotulo}
      </Text>
    </Box>
  );
}
