import { useMemo, useState } from "react";
import { Box, Checkbox, Flex, Progress, Table, Text } from "@chakra-ui/react";

import {
  Botao,
  BotaoNu,
  Campo,
  CampoDeResponsaveis,
  CelulaComSub,
  Pagination,
  Tabela,
} from "../../../../components";
import { mascararNumeroProcesso } from "../../../../utils";
import {
  concordar,
  quantosNoutroSubgrupo,
  rotuloDeImportar,
  rotuloDeResponsavel,
  selecionaveis,
} from "../../../../utils/importacao";
import { TAMANHO_PAGINA_PADRAO } from "../../../../constants";
import { COLUNAS_DA_PREVIA, ESTILO_DE_LINK } from "../../constants";
import AvisoDaImportacao from "../AvisoDaImportacao";
import CartaoDeResumo from "../CartaoDeResumo";
import EtiquetaDeSituacao from "../EtiquetaDeSituacao";
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
      {/* `.resumo` do desenho: grade que se reparte sozinha, não uma fileira
          de `flex: 1` -- com quatro cartões estreitos a diferença aparece na
          quebra, onde o `flex` deixa um sozinho esticado na segunda linha. */}
      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fit, minmax(136px, 1fr))"
        gap="12px"
        mb="18px"
      >
        <CartaoDeResumo
          numero={previa.processos.length}
          rotulo={concordar(previa.processos.length, "encontrado", "encontrados")}
        />
        {/* ⚠️ "seriam cadastrados", não "novos": o cartão responde o que
            acontece se a pessoa confirmar, e é o número que ela confere antes
            de clicar. "Novos" descreveria a lista; este descreve a ação.

            ⚠️ E "NESTE SUBGRUPO" no fim, porque sem isso o cartão respondia
            uma pergunta mais larga do que a que ele responde: com 21 de 23
            já acompanhados em outro lugar, "21 seriam cadastrados" se lê
            como "21 são novos no sistema" -- e nenhum é.

            🔴 E vem ANTES do "já estão neste subgrupo", como no desenho: a
            ordem é a da decisão -- quantos achei, quantos entram, quantos
            não. Pôr o impedimento no meio interrompe a leitura. */}
        {/* 🔴 Segue a SELEÇÃO, não o total de importáveis: desmarcar cinco e
            o cartão continuar dizendo que eles "seriam cadastrados" seria
            uma promessa que o botão logo abaixo não cumpre. */}
        <CartaoDeResumo
          numero={marcados.size}
          rotulo={concordar(
            marcados.size,
            "seria cadastrado neste subgrupo",
            "seriam cadastrados neste subgrupo",
          )}
          tom="bom"
        />
        <CartaoDeResumo
          numero={jaExistem}
          rotulo={concordar(jaExistem, "já está neste subgrupo", "já estão neste subgrupo")}
          tom="atencao"
        />
        {/* 🔴 Azul, e não verde nem âmbar: verde diria "entra", âmbar diria
            "não entra", e este número não é nem um nem outro -- é um RECORTE
            dos que entram, para quem quiser desmarcar.

            ⚠️ E "TAMBÉM" carrega a aritmética: os três primeiros somam
            (novos + já aqui = encontrados); este é subconjunto dos novos, não
            uma quarta parcela. */}
        <CartaoDeResumo
          numero={noutroSubgrupo}
          rotulo={concordar(
            noutroSubgrupo,
            "também em outro subgrupo",
            "também em outros subgrupos",
          )}
          tom="marca"
        />
      </Box>

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
            <Table.Row
              key={p.numero_processo}
              /* O alvo do mouse é a linha inteira, não só a caixa -- e por
                 isso o cursor de recusa também é dela. Mesmo padrão de
                 `CampoDeArquivo`. */
              cursor={p.ja_existe ? "not-allowed" : "pointer"}
              _hover={{ bg: "bg.canvas" }}
              /* 🔴 O clique vindo da CAIXA não passa por aqui -- `Checkbox.Root`
                 é um `<label>`, então clicar nela já dispara o
                 `onCheckedChange` E sobe para a linha. Com os dois marcando,
                 a caixa "não funcionava": marcava e desmarcava no mesmo
                 clique, e o único alvo que respondia era o resto da linha. */
              onClick={(evento) => {
                if (p.ja_existe) return;
                if ((evento.target as HTMLElement).closest("label")) return;
                alternar(p.numero_processo);
              }}
            >
              {/* 🔴 `CelulaComSub` em TODAS as células, inclusive nas de uma
                  linha só. `Table.Cell` crua não tem o padding de `.tbl td`
                  (13px 14px) nem a divisória, e o cabeçalho tem 14px de
                  recuo -- então o valor não nasce embaixo do título da
                  coluna, e a divisória some no meio da linha.

                  ⚠️ É o MESMO defeito que `LinhaProcesso` já registra na
                  coluna de prazo. Segunda ocorrência: virou guarda mecânico
                  em `celulaDeTabela.test.ts`. */}
              <CelulaComSub
                largura="42px"
                principal={
                  <Checkbox.Root
                    checked={marcados.has(p.numero_processo)}
                    disabled={p.ja_existe}
                    onCheckedChange={() => alternar(p.numero_processo)}
                    aria-label={`Importar ${p.apelido}`}
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control />
                  </Checkbox.Root>
                }
              />
              {/* ⚠️ O já cadastrado sai esmaecido (`tr.ja-existe .apelido` no
                  desenho): a linha continua legível, mas some do primeiro
                  plano -- ela é a única que não vai a lugar nenhum. */}
              <CelulaComSub
                variante="processo"
                principal={
                  p.ja_existe ? (
                    <Text as="span" color="fg.muted" fontWeight="400">
                      {p.apelido}
                    </Text>
                  ) : (
                    p.apelido
                  )
                }
                sub={mascararNumeroProcesso(p.numero_processo)}
              />
              <CelulaComSub principal={p.tribunal || "—"} />
              <CelulaComSub principal={<Text className="num">{p.comunicacoes}</Text>} />
              <CelulaComSub principal={<EtiquetaDeSituacao processo={p} />} />
            </Table.Row>
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
