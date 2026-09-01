import { Box, Input, Switch, Text } from "@chakra-ui/react";
import { useState, type FormEvent } from "react";

import {
  Botao,
  Campo,
  CampoDeLeitura,
  LinhaDeCampos,
  Modal,
  MultiSelect,
  RodapeDeAcoes,
  Select,
} from "../../../../components";
import { UFS } from "../../../../constants";
import { erroDaInscricao, partesDaInscricao } from "../../../../utils/oab";
import type { InscricaoAvulsa, Subgrupo } from "../../../../types";

interface ModalDaInscricaoProps {
  /** A inscrição sendo EDITADA. Ausente = está se cadastrando uma nova. */
  inscricao?: InscricaoAvulsa;
  subgrupos: Subgrupo[];
  carregandoSubgrupos: boolean;
  salvando: boolean;
  /** Recusa vinda do servidor, já com a mensagem dele -- inscrição que é de
   * alguém com conta, que o tribunal não conhece, ou o tribunal fora do ar. */
  erro?: string;
  onSalvar: (numero: string, uf: string, ligada: boolean, destinos: string[]) => void;
  onFechar: () => void;
}

/** Cadastrar ou editar uma inscrição avulsa.
 *
 * 🔴 **Um modal, e não uma linha embutida na tabela** -- e a razão é que a
 * decisão tem QUATRO partes que dependem entre si: a inscrição, o interruptor,
 * e o destino que só faz sentido com o interruptor ligado. Espalhá-las na
 * linha faria a tabela carregar controles que 49 das 50 linhas não estão
 * usando.
 *
 * 🔴 **E o mesmo modal EDITA**, porque o servidor zera `subgrupos_destino` ao
 * desligar: uma inscrição desligada não tem destino guardado, então religá-la
 * é sempre escolher o destino de novo. Sem este caminho, o interruptor da
 * linha ligaria sem destino e tomaria 400.
 *
 * ⚠️ **Número e UF ficam de LEITURA na edição.** Trocá-los não seria editar --
 * seria outra inscrição, e a antiga continuaria na lista. Quem quer trocar
 * remove e cadastra, que é o que de fato acontece.
 */
export default function ModalDaInscricao({
  inscricao,
  subgrupos,
  carregandoSubgrupos,
  salvando,
  erro,
  onSalvar,
  onFechar,
}: ModalDaInscricaoProps) {
  const editando = Boolean(inscricao);
  const partes = inscricao ? partesDaInscricao(inscricao.inscricao) : null;

  const [numero, setNumero] = useState(partes?.numero ?? "");
  const [uf, setUf] = useState(partes?.uf ?? "");
  const [ligada, setLigada] = useState(inscricao?.importacao_automatica ?? false);
  const [destinos, setDestinos] = useState<string[]>(inscricao?.subgrupos_destino ?? []);
  /** O erro de formato só aparece depois de TENTAR: mostrá-lo enquanto a
   * pessoa digita acusaria "informe o número" no primeiro caractere. */
  const [tentou, setTentou] = useState(false);

  const erroDeFormato = erroDaInscricao(numero, uf, { obrigatoria: true });
  const semSubgrupo = subgrupos.length === 0;
  /* 🔴 O único estado que o servidor recusa e a tela consegue prever
     (`DestinoDaImportacaoAusente`). Barrar aqui evita um 400 que a pessoa
     leria como falha do sistema. */
  const faltaDestino = ligada && destinos.length === 0;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTentou(true);
    if (erroDeFormato || faltaDestino) return;
    onSalvar(numero.trim(), uf.trim().toUpperCase(), ligada, ligada ? destinos : []);
  }

  return (
    <Modal
      titulo={editando ? "Editar inscrição" : "Adicionar inscrição"}
      subtitulo="Uma OAB que o escritório acompanha e que não pertence a ninguém com conta."
      onFechar={onFechar}
      rodape={
        /* 🔴 `RodapeDeAcoes`, e não os botões crus: o `Modal` renderiza a prop
           `rodape` como ela vem -- sem faixa, sem recuo e sem alinhar à
           direita. Sem ele, o "Cancelar" nasce colado na borda esquerda do
           cartão e a faixa do artifact não existe. Medido em Chrome. */
        <RodapeDeAcoes>
          <Botao variante="ghost" onClick={onFechar} disabled={salvando}>
            Cancelar
          </Botao>
          <Botao
            type="submit"
            form="form-da-inscricao"
            disabled={salvando || faltaDestino || (tentou && Boolean(erroDeFormato))}
          >
            {salvando ? "Salvando…" : editando ? "Salvar" : "Adicionar"}
          </Botao>
        </RodapeDeAcoes>
      }
    >
      {/* ⚠️ `form` com `id` e o botão do RODAPÉ apontando pra ele: o rodapé do
          `Modal` fica fora do `children`, então um `type="submit"` lá dentro
          não pertenceria a este formulário -- e o Enter no campo não salvaria. */}
      <form id="form-da-inscricao" onSubmit={handleSubmit}>
        <LinhaDeCampos>
          {editando ? (
            <>
              <CampoDeLeitura rotulo="Número">{numero}</CampoDeLeitura>
              <CampoDeLeitura rotulo="UF">{uf}</CampoDeLeitura>
            </>
          ) : (
            <>
              <Campo
                rotulo="Número"
                para="numero-da-inscricao"
                obrigatorio
                erro={
                  tentou && erroDeFormato?.campo === "numeroOab"
                    ? erroDeFormato.mensagem
                    : undefined
                }
              >
                <Input
                  id="numero-da-inscricao"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  inputMode="numeric"
                  placeholder="Ex.: 148502"
                />
              </Campo>
              <Campo
                rotulo="UF"
                para="uf-da-inscricao"
                obrigatorio
                erro={
                  tentou && erroDeFormato?.campo === "ufOab"
                    ? erroDeFormato.mensagem
                    : undefined
                }
              >
                <Select
                  id="uf-da-inscricao"
                  opcoes={UFS.map((sigla) => ({ value: sigla, label: sigla }))}
                  valor={uf}
                  onMudar={setUf}
                  placeholder="UF"
                  comOpcaoTodas={false}
                  largura="120px"
                />
              </Campo>
            </>
          )}
        </LinhaDeCampos>

        {/* 🔴 A distinção que a tela inteira depende de carregar: estar na
            lista VIGIA, o interruptor CRIA. Confundir os dois faz alguém
            desligar a importação achando que economiza, e silenciar o
            monitoramento sem perceber. */}
        <Box
          mt="14px"
          mb="18px"
          p="10px 12px"
          borderLeftWidth="3px"
          borderLeftColor="brand.tint2"
          bg="bg.subtle"
          borderRadius="sm"
          fontSize="12px"
          color="fg.muted"
        >
          Cadastrar já faz o sistema <strong>acompanhar</strong> os processos desta
          inscrição. O interruptor abaixo decide outra coisa: se processos{" "}
          <strong>novos</strong> passam a ser cadastrados sozinhos.
        </Box>

        <Switch.Root
          checked={ligada}
          onCheckedChange={(e) => setLigada(e.checked)}
          disabled={salvando || semSubgrupo}
        >
          {/* ⚠️ **Sem `role="switch"`** -- ver `InterruptorDaImportacao`. */}
          <Switch.HiddenInput />
          <Switch.Control _checked={{ bg: "brand" }}>
            <Switch.Thumb />
          </Switch.Control>
          <Switch.Label fontSize="13px" fontWeight="600">
            Cadastrar sozinho os processos desta inscrição
          </Switch.Label>
        </Switch.Root>

        {semSubgrupo && (
          <Text mt="6px" fontSize="11.5px" color="fg.muted">
            Crie um subgrupo para poder ligar.
          </Text>
        )}

        {/* 🔴 O seletor só aparece LIGADO: desligado, o servidor zera o
            destino, e um campo cujo valor será descartado é um campo que
            mente. É o mesmo motivo de o interruptor do perfil só mostrar o
            "Cadastrar em" quando ligado. */}
        {ligada && (
          <Box mt="16px">
            <Campo
              rotulo="Subgrupos de destino"
              para="destinos-da-inscricao"
              obrigatorio
              dica="Os processos entram em todos os subgrupos marcados. Pode escolher mais de um."
              erro={tentou && faltaDestino ? "Escolha ao menos um subgrupo" : undefined}
            >
              <MultiSelect
                id="destinos-da-inscricao"
                opcoes={subgrupos.map((s) => ({ value: s.subgrupo_id, label: s.nome }))}
                selecionados={destinos}
                onMudar={setDestinos}
                placeholder="Selecione"
                carregando={carregandoSubgrupos}
                desabilitado={salvando}
              />
            </Campo>
          </Box>
        )}

        {erro && (
          <Text mt="14px" fontSize="12px" color="status.bad">
            {erro}
          </Text>
        )}
      </form>
    </Modal>
  );
}
