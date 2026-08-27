import { useState } from "react";
import { Box, Input, Text } from "@chakra-ui/react";

import {
  Botao,
  BotaoDeTexto,
  Campo,
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
          <BotaoDeTexto onClick={() => setMostrarPeriodo(true)}>
            Buscar por período
          </BotaoDeTexto>
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
