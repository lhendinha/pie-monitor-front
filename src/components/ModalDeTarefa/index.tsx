import { Stack, Textarea } from "@chakra-ui/react";
import { useId } from "react";

/* Irmãos importados um a um, e não pelo índice de `components`: este
   componente É exportado por aquele índice, e importar dele criaria um ciclo
   -- mesmo padrão do `SeletorDePeriodo`. */
import Botao from "../Botao";
import RodapeDeFormulario from "../RodapeDeFormulario";
import Campo from "../Campo";
import LinhaDeCampos from "../LinhaDeCampos";
import Modal from "../Modal";
import ModalDeConfirmacao from "../ModalDeConfirmacao";
import { Select } from "../Select";
import SeletorData from "../SeletorData";
import { comOpcaoEscolhida } from "../../hooks/useOpcoesBuscaveis";
import { PRIORIDADES, TAMANHO_MAXIMO_DO_TITULO_DE_TAREFA } from "../../constants";
import VinculoDeRegistro from "../VinculoDeRegistro";
import { useFormularioDeTarefa } from "./useFormularioDeTarefa";

import type { Tarefa, Vinculo } from "../../types";

interface ModalDeTarefaProps {
  /** Ausente = criando. */
  tarefa?: Tarefa | null;
  /** Subgrupo em que o modal ABRE. Depois disso quem manda é o seletor:
   * ao criar, a pessoa pode escolher outro. */
  subgrupoAtual: string;
  /** O NOME do subgrupo atual, pra quando ele estiver fora da primeira
   * página: editando, este campo existe só pra DIZER a que subgrupo a tarefa
   * pertence, e sem o nome ele diria o id. */
  subgrupoAtualNome?: string;
  /** Coluna pré-escolhida, quando veio do "+ Nova atividade" de uma coluna. */
  colunaInicial?: string;
  /** Vínculo já preenchido ao CRIAR -- quando a tarefa nasce de dentro de
   * um processo ou atendimento que a pessoa já está olhando.
   *
   * Molde de `DocumentosVinculados`, que tem o mesmo par
   * `subgrupoInicial`/`vinculoInicial` pela mesma necessidade: uma segunda
   * forma aqui seria a porta irmã de sempre.
   *
   * ⚠️ Leva o RÓTULO junto, não só o id: `VinculoDeRegistro` mostra a
   * etiqueta do que foi vinculado, e um número CNJ cru não se confere de
   * relance.
   *
   * Ignorado ao EDITAR: ali o vínculo é o da tarefa. */
  vinculoInicial?: Vinculo | null;
  /** Data pré-escolhida ao CRIAR -- é o dia que a Agenda tem à vista.
   *
   * Sem isto a tarefa criada na Agenda nasceria com a data de hoje e
   * sumiria da tela em que foi criada, se a pessoa estivesse olhando outro
   * mês. Ignorada ao editar: ali a data é a da tarefa. */
  dataInicial?: string;
  onSalvo: () => void;
  onFechar: () => void;
}

/** Criar e editar tarefa.
 *
 * ⚠️ Duas divergências do artifact, as duas por limite real da API:
 *
 * 1. **"Lista de tarefas" não existe aqui.** No artifact é um `select`
 *    obrigatório com UMA opção, já selecionada, que ninguém consegue mudar
 *    -- e não existe no backend: nenhuma rota aceita esse campo. É resquício
 *    de uma ideia que virou o próprio quadro. Um obrigatório de uma opção só
 *    é ruído puro, com um asterisco que promete uma decisão inexistente.
 *
 * 2. **Subgrupo só se escolhe ao CRIAR.** `subgrupo_id` faz parte da chave
 *    primária (`{subgrupo_id, tarefa_id}`) e o `PATCH` não o aceita -- nem
 *    poderia, DynamoDB não altera chave. Mover entre subgrupos seria apagar
 *    e recriar, o que gera um `tarefa_id` novo e mata os links de lembrete
 *    já enviados por e-mail. Editando, o campo fica desabilitado mostrando
 *    a qual subgrupo a tarefa pertence: sumir com ele deixaria a pessoa sem
 *    saber onde a tarefa vive, e deixá-lo editável seria prometer o que
 *    falha ao salvar.
 */
export default function ModalDeTarefa({
  tarefa,
  subgrupoAtual,
  subgrupoAtualNome,
  colunaInicial,
  vinculoInicial,
  dataInicial,
  onSalvo,
  onFechar,
}: ModalDeTarefaProps) {
  const idFormulario = useId();
  const {
    editando,
    titulo,
    setTitulo,
    data,
    setData,
    subgrupoId,
    trocarSubgrupo,
    subgrupos,
    colunas,
    colunaEscolhida,
    setColunaId,
    carregandoQuadro,
    prioridade,
    setPrioridade,
    responsavel,
    setResponsavel,
    opcoesDeResponsavel,
    vinculos,
    setVinculos,
    confirmandoRemocao,
    setConfirmandoRemocao,
    mudou,
    salvando,
    excluindo,
    excluir,
    handleSubmit,
  } = useFormularioDeTarefa({
    tarefa,
    subgrupoAtual,
    colunaInicial,
    vinculoInicial,
    dataInicial,
    onSalvo,
    onFechar,
  });

  return (
    <>
      <Modal
        descarte={{ mudou, caso: editando ? "edicao" : "criacao" }}
      titulo={editando ? "Editar tarefa" : "Nova tarefa"}
      onFechar={onFechar}
      rodape={
        <RodapeDeFormulario
          salvando={salvando}
          acaoAEsquerda={
            editando ? (
            <Botao
              variante="perigoContorno"
              mr="auto"
              disabled={excluindo}
              /* Passa pelo diálogo como TODA exclusão do sistema. Era a
                 única que não passava: um clique só, sem volta, e cujo
                 único retorno era o botão ficar desabilitado com o mesmo
                 rótulo -- parecia não ter feito nada. */
              onClick={() => setConfirmandoRemocao(true)}
            >
              {excluindo ? "Excluindo…" : "Excluir"}
            </Botao>
            ) : undefined
          }
        >
          <Botao
            type="submit"
            form={idFormulario}
            disabled={salvando || !titulo.trim() || !colunaEscolhida}
          >
            {salvando ? "Salvando…" : "Salvar"}
          </Botao>
        </RodapeDeFormulario>
      }
    >
      <form id={idFormulario} onSubmit={handleSubmit}>
        <Stack gap="0">
          <Campo rotulo="Descrição da tarefa" para="tf-titulo" obrigatorio>
            <Textarea
              id="tf-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={TAMANHO_MAXIMO_DO_TITULO_DE_TAREFA}
              autoFocus
            />
          </Campo>

          <LinhaDeCampos>
            <Campo rotulo="Data" para="tf-data" obrigatorio>
              <SeletorData
                id="tf-data"
                rotuladoPor="tf-data-rotulo"
                valor={data}
                onMudar={setData}
              />
            </Campo>
            <Campo rotulo="Prioridade" para="tf-prioridade" obrigatorio>
              <Select
                id="tf-prioridade"
                opcoes={PRIORIDADES.map((p) => ({ value: p, label: p }))}
                valor={prioridade}
                onMudar={setPrioridade}
              />
            </Campo>
          </LinhaDeCampos>

          {/* Posição do artifact: depois da linha de Data, antes de
              Responsável. Não é obrigatório -- tarefa solta, sem processo
              nem atendimento, é caso comum.

              ⚠️ O campo é UM, então na prática escolhe-se um vínculo só.
              Isso é a forma do campo (é assim no artifact), NÃO uma regra
              do sistema: a API aceita `processo_numero` e `atendimento_id`
              ao mesmo tempo e grava os dois -- verificado. A dica não pode
              anunciar uma restrição que o servidor não tem. */}
          <Campo
            rotulo="Processo ou atendimento vinculado"
            para="tf-vinculo"
            dica="Opcional. Dá pra vincular um processo, um atendimento, ou os dois."
          >
            <VinculoDeRegistro id="tf-vinculo" valor={vinculos} onMudar={setVinculos} />
          </Campo>

          <LinhaDeCampos>
            <Campo rotulo="Responsável" para="tf-responsavel">
              <Select
                id="tf-responsavel"
                opcoes={opcoesDeResponsavel}
                valor={responsavel}
                onMudar={setResponsavel}
              />
            </Campo>
            <Campo
              rotulo="Subgrupo"
              para="tf-subgrupo"
              obrigatorio
              dica={editando ? "O subgrupo de uma tarefa não muda." : undefined}
            >
              <Select
                id="tf-subgrupo"
                /* O atual entra na lista mesmo fora da primeira página --
                   editando, este campo existe só pra DIZER a que subgrupo a
                   tarefa pertence, e sem o nome ele diria o id. */
                opcoes={comOpcaoEscolhida(subgrupos.opcoes, subgrupoId, subgrupoAtualNome ?? "")}
                valor={subgrupoId}
                onMudar={trocarSubgrupo}
                desabilitado={editando}
                /* Sem busca quando está desabilitado: não há o que escolher. */
                {...(editando
                  ? {}
                  : {
                      onBuscar: subgrupos.buscar,
                      carregando: subgrupos.carregando,
                      erro: subgrupos.erro,
                      onTentarDeNovo: subgrupos.tentarDeNovo,
                    })}
              />
            </Campo>
          </LinhaDeCampos>

          <Campo
            rotulo="Coluna do quadro"
            para="tf-coluna"
            obrigatorio
          >
            <Select
              id="tf-coluna"
              opcoes={colunas.map((c) => ({ value: c.coluna_id, label: c.nome }))}
              valor={colunaEscolhida}
              onMudar={setColunaId}
              carregando={carregandoQuadro}
            />
          </Campo>
        </Stack>
      </form>
      </Modal>

      {/* IRMÃO do modal, não filho: o corpo do `Modal` tem `overflow-y`, e
          uma sobreposição `position: fixed` lá dentro fica à mercê de
          qualquer ancestral com `transform`. Fora, é uma camada limpa por
          cima da outra. */}
      {confirmandoRemocao && tarefa && (
        <ModalDeConfirmacao
          titulo="Excluir tarefa"
          mensagem={
            <>
              A tarefa <strong>{tarefa.titulo}</strong> será removida do quadro.
            </>
          }
          confirmando={excluindo}
          onConfirmar={excluir}
          onFechar={() => setConfirmandoRemocao(false)}
        />
      )}
    </>
  );
}
