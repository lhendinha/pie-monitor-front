import { useState } from "react";
import { Box, Flex, Input, Text } from "@chakra-ui/react";

import {
  Botao,
  BotaoNu,
  Campo,
  IconeX,
  LinhaDeCampos,
  Select,
  SeletorData,
} from "../../../../components";
import { UFS } from "../../../../constants";
import { erroDaBusca } from "../../../../utils/importacao";
import type { ErroDaBuscaPorOab } from "../../../../types";

interface FormularioDeOabProps {
  buscando: boolean;
  onBuscar: (numeroOab: string, ufOab: string, periodo: { de: string; ate: string }) => void;
  onCancelar: () => void;
  /** Abre o período já visível -- é o que o aviso de "processos demais" usa
   * para a pessoa não ter de procurar onde escolher. */
  periodoAberto?: boolean;
}

/** Quem se busca, e opcionalmente em que período.
 *
 * 🔴 **O período fica ESCONDIDO no caminho comum.** Quem tem uma inscrição de
 * tamanho normal nunca precisa dele, e um campo a mais é um campo a mais para
 * ler antes de entender a tela. Ele aparece por um link -- ou sozinho, quando
 * a busca esbarra no limite e a saída passa a ser justamente ele.
 */
export default function FormularioDeOab({
  buscando,
  onBuscar,
  onCancelar,
  periodoAberto = false,
}: FormularioDeOabProps) {
  const [numeroOab, setNumeroOab] = useState("");
  const [ufOab, setUfOab] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [mostrarPeriodo, setMostrarPeriodo] = useState(periodoAberto);
  const [erro, setErro] = useState<ErroDaBuscaPorOab>(null);

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    /* ⚠️ Valida ANTES de consultar: gastar os segundos da busca para
       descobrir que o campo está em branco daria a resposta com a cara
       errada ("nada encontrado" em vez de "faltou preencher"). */
    const problema = erroDaBusca(numeroOab, ufOab, de, ate);
    setErro(problema);
    if (problema) return;
    onBuscar(numeroOab.trim(), ufOab, { de, ate });
  }

  const mensagemDe = (campo: NonNullable<ErroDaBuscaPorOab>["campo"]) =>
    erro?.campo === campo ? erro.mensagem : "";

  /** Fechar o período é DESISTIR dele: some a caixa e somem as datas.
   *
   * ⚠️ E o erro de período vai junto -- "A data inicial não pode ser
   * posterior à final" apontaria para dois campos que não estão mais na
   * tela, travando a busca sem mostrar o que corrigir. */
  function fecharPeriodo() {
    setDe("");
    setAte("");
    setMostrarPeriodo(false);
    if (erro?.campo === "periodo") setErro(null);
  }

  return (
    <Box as="form" onSubmit={enviar}>
      <LinhaDeCampos>
        <Campo rotulo="Número da OAB" para="numero-oab" obrigatorio erro={mensagemDe("numeroOab")}>
          <Input
            id="numero-oab"
            value={numeroOab}
            /* `inputMode` numérico abre o teclado certo no celular sem
               recusar colagem de texto -- `type="number"` traria as setinhas
               e o comportamento de rolagem, que aqui não fazem sentido. */
            inputMode="numeric"
            placeholder="000000"
            onChange={(e) => {
              setNumeroOab(e.target.value);
              if (erro) setErro(null);
            }}
          />
        </Campo>
        <Campo rotulo="UF da OAB" para="uf-oab" obrigatorio erro={mensagemDe("ufOab")}>
          <Select
            id="uf-oab"
            /* ⚠️ Digitável: são 27 opções, e sem busca chegar em "SP" é
               rolar a lista inteira. `permitirBusca` põe o cursor no
               próprio controle -- é o `isSearchable` da lib, o mesmo
               caminho dos filtros de fase e situação. */
            permitirBusca
            /* 🔴 Opção vazia explícita: o `Select` do projeto NÃO é clearable,
               e sem ela quem escolhe uma UF nunca mais volta ao estado inicial.
               É a mesma razão escrita em `CamposProcesso`. */
            opcoes={[{ value: "", label: "Selecione" }, ...UFS.map((uf) => ({ value: uf, label: uf }))]}
            valor={ufOab}
            onMudar={(v) => {
              setUfOab(v);
              if (erro) setErro(null);
            }}
          />
        </Campo>
      </LinhaDeCampos>

      {mostrarPeriodo ? (
        <Box
          mt="2px"
          mb="18px"
          p="14px 16px"
          border="1px dashed"
          borderColor="border"
          borderRadius="10px"
          bg="bg.subtle"
        >
          {/* 🔴 O X em FAIXA PRÓPRIA, não flutuando no canto. Absoluto ele
              caía por cima dos rótulos de "De" e "Até": medido no Chrome,
              dos cinco pontos do alvo só o do meio fechava -- o resto do
              quadrado era do `<label>`, e `zIndex` não resolveu porque são
              várias caixas sobrepostas. Aqui nada disputa o clique.

              ⚠️ Fechar LIMPA as duas datas, não só esconde a caixa. Um
              período preenchido atrás de um cartão fechado filtraria a busca
              sem nada na tela dizendo isso -- e a pessoa concluiria que a
              OAB não tem os processos que ela sabe que tem. */}
          <Flex justifyContent="flex-end" mt="-6px" mb="2px">
            <BotaoNu
              type="button"
              aria-label="Fechar o período"
              title="Fechar o período"
              onClick={fecharPeriodo}
              display="flex"
              alignItems="center"
              justifyContent="center"
              /* 28px de alvo: o menor quadrado que a mão acerta sem mirar --
                 o glifo de 11px sozinho não é alvo nenhum. */
              w="28px"
              h="28px"
              mr="-6px"
              borderRadius="full"
              color="fg.subtle"
              _hover={{ bg: "border.subtle", color: "fg" }}
              css={{ "& svg": { width: "11px", height: "11px" } }}
            >
              <IconeX />
            </BotaoNu>
          </Flex>
          <LinhaDeCampos>
            <Campo rotulo="De" para="periodo-de" erro={mensagemDe("periodo")}>
              <SeletorData
                id="periodo-de"
                rotuladoPor="periodo-de-rotulo"
                valor={de}
                onMudar={(v) => {
                  setDe(v);
                  if (erro) setErro(null);
                }}
                placeholder="Início"
              />
            </Campo>
            <Campo rotulo="Até" para="periodo-ate">
              <SeletorData
                id="periodo-ate"
                rotuladoPor="periodo-ate-rotulo"
                valor={ate}
                onMudar={(v) => {
                  setAte(v);
                  if (erro) setErro(null);
                }}
                placeholder="Fim"
              />
            </Campo>
          </LinhaDeCampos>
          <Text fontSize="11.5px" color="fg.muted">
            Em branco traz o histórico inteiro. Só é preciso preencher quando a
            inscrição tem processos demais.
          </Text>
        </Box>
      ) : (
        <Box mb="6px">
          {/* ⚠️ `BotaoNu`, não `BotaoDeTexto`: aquele é o "← Voltar" das telas
              de detalhe, com 9px de padding vertical -- 40px de altura contra
              os 17px do desenho. Medido nos dois lugares; o errado era o uso.

              `BotaoNu` é `<button>` com `padding: 0` e `type` na tipagem, que
              é o que impede um botão dentro de formulário virar submit. */}
          {/* Medidas do `.link-periodo` do desenho: 12,5px/700 e sublinhado
              SEMPRE, não só no hover -- sozinho no meio do formulário, sem o
              sublinhado ele não se anuncia como controle. */}
          <BotaoNu
            color="fg.brand"
            fontSize="12.5px"
            fontWeight={700}
            textDecoration="underline"
            textUnderlineOffset="2px"
            _hover={{ color: "brand.dark" }}
            onClick={() => setMostrarPeriodo(true)}
          >
            Buscar por período
          </BotaoNu>
        </Box>
      )}

      <Box display="flex" gap="9px" alignItems="center" flexWrap="wrap">
        <Botao type="submit" loading={buscando}>
          Buscar processos
        </Botao>
        <Botao variante="ghost" onClick={onCancelar} disabled={buscando}>
          Cancelar
        </Botao>
        <Text fontSize="13px" color="fg.muted">
          A busca não cadastra nada — traz uma lista para conferir.
        </Text>
      </Box>
    </Box>
  );
}
