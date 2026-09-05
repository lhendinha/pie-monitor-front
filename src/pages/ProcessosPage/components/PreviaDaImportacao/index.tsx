import { useMemo, useState } from "react";
import { Box, Flex, Progress, Text } from "@chakra-ui/react";

import {
  Botao,
  BotaoNu,
  Campo,
  CampoDeResponsaveis,
  Pagination,
  Tabela,
} from "../../../../components";
import {
  concordar,
  preSelecionados,
  quantosNoutroSubgrupo,
  rotuloDeImportar,
  rotuloDeResponsavel,
  selecionaveis,
} from "../../../../utils/importacao";
import { TAMANHO_PAGINA_PADRAO } from "../../../../constants";
import { COLUNAS_DA_PREVIA, ESTILO_DE_LINK } from "../../constants";
import AvisoDaImportacao from "../AvisoDaImportacao";
import LinhaDaPrevia from "../LinhaDaPrevia";
import ResumoDaPrevia from "../ResumoDaPrevia";
import type { PreviaDaImportacaoProps } from "./types";

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
  /* 🔴 Abre marcando tudo que dá para importar, MENOS o que este subgrupo já
     apagou de propósito. Quem apagou tomou uma decisão, e o padrão da tela
     respeita: vindo pré-marcado, bastaria não reparar na etiqueta para
     desfazer a própria exclusão -- e numa lista de 500 ninguém repara em uma
     linha.

     ⚠️ `disponiveis` continua sendo o que PODE ser marcado, e é ele que
     alimenta o "Marcar todos" e o total do "N de M". A marca não trava
     nada: só muda o estado inicial. */
  const [marcados, setMarcados] = useState<Set<string>>(
    () => new Set(preSelecionados(previa.processos)),
  );
  const [responsaveis, setResponsaveis] = useState<string[]>(souMembro ? [meuEmail] : []);

  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO);

  const jaExistem = previa.processos.length - disponiveis.length;
  const noutroSubgrupo = useMemo(
    () => quantosNoutroSubgrupo(previa.processos),
    [previa.processos],
  );
  const comunicacoes = useMemo(
    () => previa.processos.reduce((soma, p) => soma + p.comunicacoes, 0),
    [previa.processos],
  );

  /* 🔴 A paginação é só de EXIBIÇÃO -- a busca inteira já está em memória.
     Quem decide o que será gravado é `marcados`, que guarda NÚMERO e não
     posição: por isso a marca sobrevive à virada de página, e "Marcar
     todos" alcança as outras páginas. Ver o teste do mesmo nome. */
  const totalPaginas = Math.max(1, Math.ceil(previa.processos.length / tamanhoPagina));
  const daPagina = previa.processos.slice((pagina - 1) * tamanhoPagina, pagina * tamanhoPagina);

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
      <ResumoDaPrevia
        encontrados={previa.processos.length}
        marcados={marcados.size}
        jaExistem={jaExistem}
        noutroSubgrupo={noutroSubgrupo}
      />

      {previa.atingiu_o_teto && (
        <AvisoDaImportacao titulo="Esta OAB tem processos demais para uma busca só.">
          Trouxemos {previa.processos.length} deles. Para alcançar o restante,
          busque por período — um ano de cada vez, por exemplo.
          {/* ⚠️ O caminho de volta fica AQUI, junto do aviso: mandar a pessoa
              procurar o campo de período na tela anterior seria dizer o
              problema sem dizer a saída.

              ⚠️ Cor de aviso e sublinhado, não a da marca: dentro de uma
              faixa âmbar, um link azul se lê como elemento de outro bloco.
              É o `.acao-periodo` do desenho. */}
          <Box mt="10px">
            <BotaoNu
              {...ESTILO_DE_LINK}
              color="status.warn.text"
              textDecoration="underline"
              textUnderlineOffset="2px"
              _hover={{ color: "status.warn.text" }}
              onClick={onVoltar}
            >
              Escolher um período →
            </BotaoNu>
          </Box>
        </AvisoDaImportacao>
      )}

      {/* 🔴 Fora da fileira de cartões, de propósito: os quatro contam
          PROCESSOS e este conta COMUNICAÇÕES. Separar por posição é mais
          forte que separar por cor -- unidades diferentes lado a lado é o
          que faz somar o que não soma.

          ⚠️ E o sujeito da segunda metade são os PROCESSOS: o que a pessoa
          ganha é que eles não nascem vazios. */}
      <Text
        fontSize="12.5px"
        color="fg.muted"
        mt="-6px"
        mb="18px"
        pl="13px"
        borderLeft="2px solid"
        borderColor="border"
      >
        <Text as="strong" color="fg.muted" fontWeight="700">
          {comunicacoes} {concordar(comunicacoes, "comunicação", "comunicações")}
        </Text>{" "}
        {concordar(comunicacoes, "somada", "somadas")}{" "}
        {concordar(previa.processos.length, "neste processo", "nestes processos")} — {}
        {concordar(previa.processos.length, "ele já entra", "eles já entram")} com o
        histórico completo.
      </Text>

      <Campo
        rotulo={rotuloDeResponsavel(marcados.size)}
        para="responsaveis-importacao"
        dica={
          souMembro
            ? `Quem vai receber os avisos ${concordar(
                marcados.size,
                "deste processo",
                `destes ${marcados.size} processos`,
              )}.`
            : /* 🔴 A frase diz o PORQUÊ, não só o que fazer: sem isso a
                 pessoa tentaria se escolher e não se acharia na lista.

                 ⚠️ **"do subgrupo SELECIONADO", e não "deste subgrupo"** --
                 corrigido em 30/08/2026, a partir de um relato de uso. O
                 seletor de subgrupo fica na etapa da BUSCA e some quando a
                 prévia aparece: nesta tela não há nada a que "este" se
                 refira. Quem é membro de 6 dos 12 subgrupos lia a frase e
                 não tinha como saber de qual ela falava.

                 "Selecionado" aponta para uma escolha que a pessoa fez, e
                 não para um contexto que a tela não mostra.

                 ➡️ A correção COMPLETA seria a prévia exibir o destino --
                 fica registrada como frente, junto com o destino múltiplo. */
              "Você não é membro do subgrupo selecionado, então precisa escolher quem responde entre os membros dele."
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
          gravado. `BotaoNu` não tem `disabled` -- e o bloqueio do grupo
          inteiro é mais honesto que travar botão por botão. */}
      {/* `.cabeca-tabela` do desenho: a CONTAGEM à esquerda, encostada na
          coluna de marcar que ela conta, e as duas ações à direita. Tudo
          junto à esquerda -- como estava -- fazia o número parecer legenda
          dos botões, e não o estado da lista. */}
      <Flex
        justifyContent="space-between"
        alignItems="center"
        gap="12px"
        mb="10px"
        mt="12px"
        flexWrap="wrap"
        opacity={importando ? 0.55 : 1}
        pointerEvents={importando ? "none" : "auto"}
      >
        <Text fontSize="12.5px" fontWeight="500" color="fg.muted">
          <Text as="strong" color="fg" fontWeight="700">
            {marcados.size}
          </Text>{" "}
          de {disponiveis.length} marcados
        </Text>
        <Flex alignItems="center">
          <BotaoNu {...ESTILO_DE_LINK} onClick={() => setMarcados(new Set(disponiveis))}>
            Marcar todos
          </BotaoNu>
          <Text as="span" color="border" mx="7px" aria-hidden>
            |
          </Text>
          <BotaoNu {...ESTILO_DE_LINK} onClick={() => setMarcados(new Set())}>
            Desmarcar todos
          </BotaoNu>
        </Flex>
      </Flex>

      {/* ⚠️ Durante a gravação a tabela inteira trava: desmarcar no meio
          mudaria o contador sem mudar o que está sendo gravado. */}
      <Box opacity={importando ? 0.55 : 1} pointerEvents={importando ? "none" : "auto"}>
        <Tabela colunas={COLUNAS_DA_PREVIA}>
          {daPagina.map((p) => (
            <LinhaDaPrevia
              key={p.numero_processo}
              processo={p}
              marcado={marcados.has(p.numero_processo)}
              onAlternar={() => alternar(p.numero_processo)}
            />
          ))}
        </Tabela>

        {/* ⚠️ A mesma barra das outras listas, e pelo mesmo motivo: 500
            linhas numa caixa rolante escondem o rodapé de confirmação, e a
            pessoa perde de vista o botão que ela precisa apertar. */}
        <Pagination
          pagina={pagina}
          totalPaginas={totalPaginas}
          total={previa.processos.length}
          tamanhoPagina={tamanhoPagina}
          onMudarPagina={setPagina}
          onMudarTamanho={(novo) => {
            setTamanhoPagina(novo);
            setPagina(1);
          }}
        />
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
