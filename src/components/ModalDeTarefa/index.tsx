import { Stack, Textarea } from "@chakra-ui/react";
import { useId, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

/* Irmãos importados um a um, e não pelo índice de `components`: este
   componente É exportado por aquele índice, e importar dele criaria um ciclo
   -- mesmo padrão do `SeletorDePeriodo`. */
import Botao from "../Botao";
import BotaoDeCancelar from "../BotaoDeCancelar";
import Campo from "../Campo";
import LinhaDeCampos from "../LinhaDeCampos";
import Modal from "../Modal";
import ModalDeConfirmacao from "../ModalDeConfirmacao";
import RodapeDeAcoes from "../RodapeDeAcoes";
import { Select } from "../Select";
import SeletorData from "../SeletorData";
import { useToast } from "../Toast";
import {
  criarTarefa,
  atualizarTarefa,
  removerTarefa,
  listarQuadro,
  listarMembrosDoSubgrupo,
} from "../../services";
import { toastErroMutation } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import { comOpcaoEscolhida, useSubgruposBuscaveis } from "../../hooks/useOpcoesBuscaveis";
import { hojeISO, mascararNumeroProcesso } from "../../utils";
import { PRIORIDADES, TAMANHO_MAXIMO_DO_TITULO_DE_TAREFA } from "../../constants";
import VinculoDeRegistro from "../VinculoDeRegistro";

import type { Tarefa, Vinculo, VinculosDeRegistro } from "../../types";
import type { RespostaDeMembros, RespostaDoQuadro } from "../../types/respostas";

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
  const editando = Boolean(tarefa);

  const [titulo, setTitulo] = useState(tarefa?.titulo ?? "");
  const [data, setData] = useState(tarefa?.data ?? dataInicial ?? hojeISO());
  const [subgrupoId, setSubgrupoId] = useState(tarefa?.subgrupo_id ?? subgrupoAtual);

  /* 🔴 Quadro e membros seguem o subgrupo ESCOLHIDO AQUI, não o da tela.
   *
   * Os dois chegavam prontos por prop, vindos da página -- que só conhece o
   * subgrupo que está exibindo. Trocar o subgrupo no formulário não mexia em
   * nenhum deles, então o seletor continuava oferecendo as colunas do quadro
   * anterior e o `POST` batia em `_validar_coluna`: "A coluna não pertence ao
   * quadro deste subgrupo". Criar tarefa em qualquer subgrupo que não fosse o
   * da tela era impossível.
   *
   * O mesmo valia pro responsável, por `_validar_responsavel`: a lista era a
   * do GRUPO inteiro, e escolher alguém de fora do subgrupo dava
   * "Responsável não é membro do subgrupo" -- defeito que existia mesmo sem
   * trocar de subgrupo.
   *
   * As chaves são as mesmas que as páginas já usam (`qk.quadro`,
   * `qk.membrosDoSubgrupo`), então o caso comum -- criar no subgrupo que já
   * está aberto -- sai do cache, sem requisição nova. */
  /** 🔴 A lista de subgrupos é DESTE modal, não da página.
   *
   * Ela chegava por prop, e a página passava o MESMO objeto pra pílula de
   * filtro e pra cá -- então digitar "famil" aqui dentro filtrava a pílula
   * atrás do modal. Reproduzido em Chrome.
   *
   * É a mesma razão que já tinha trazido o quadro e os membros pra cá: o que
   * o formulário oferece segue o que ELE tem escolhido, não o que a tela
   * está exibindo. O React Query deduplica por chave, então o caso comum --
   * a página já ter pedido a primeira página -- sai do cache, sem
   * requisição nova. */
  const subgrupos = useSubgruposBuscaveis(true);

  const quadroQuery = useQuery<RespostaDoQuadro>({
    queryKey: qk.quadro(subgrupoId),
    queryFn: () => listarQuadro(subgrupoId) as Promise<RespostaDoQuadro>,
    enabled: Boolean(subgrupoId),
  });
  /** Ordenadas: a API não promete ordem, e a primeira coluna é o padrão. */
  const colunas = [...(quadroQuery.data?.colunas ?? [])].sort((a, b) => a.ordem - b.ordem);

  /* Quem pode ser responsável: os membros DO SUBGRUPO escolhido -- o mesmo
     recorte que `_validar_responsavel` aplica no servidor.
     Sem trava de papel: a rota tem piso `user`, e o recorte dela é
     participar do subgrupo. Antes exigia `manager`, e o efeito era um `user`
     não conseguir atribuir tarefa a ninguém -- nem a si mesmo, o que o
     deixava fora de "minhas tarefas", dos cartões da Área de trabalho e do
     lembrete de prazo. */
  const membrosQuery = useQuery<RespostaDeMembros>({
    queryKey: qk.membrosDoSubgrupo(subgrupoId),
    queryFn: () => listarMembrosDoSubgrupo(subgrupoId) as Promise<RespostaDeMembros>,
    enabled: Boolean(subgrupoId),
  });
  const membros = membrosQuery.data?.membros ?? [];

  const [colunaId, setColunaId] = useState(tarefa?.coluna_id ?? colunaInicial ?? "");
  const [prioridade, setPrioridade] = useState(tarefa?.prioridade ?? "Média");
  const [responsavel, setResponsavel] = useState(tarefa?.responsavel_id ?? "");
  /** O rótulo inicial é o próprio número/id: o nome bonito (apelido do
   * processo, assunto do atendimento) exigiria buscar o item só pra abrir o
   * modal, e mostrar campo vazio numa tarefa QUE TEM vínculo seria pior --
   * salvar por cima apagaria o vínculo sem a pessoa perceber. */
  const [vinculos, setVinculos] = useState<VinculosDeRegistro>(() => {
    /* ⚠️ Editar tem precedência: `vinculoInicial` só semeia quando NÃO há
       tarefa. Deixar os dois competirem faria abrir uma tarefa já
       vinculada a partir de uma tela de outro processo trocar o vínculo
       dela em silêncio -- e salvar gravaria a troca. */
    if (tarefa) {
      return {
        processo: tarefa.processo_numero
          ? {
              tipo: "processo",
              id: tarefa.processo_numero,
              rotulo: mascararNumeroProcesso(tarefa.processo_numero),
            }
          : null,
        atendimento: tarefa.atendimento_id
          ? { tipo: "atendimento", id: tarefa.atendimento_id, rotulo: tarefa.atendimento_id }
          : null,
      };
    }
    return {
      processo: vinculoInicial?.tipo === "processo" ? vinculoInicial : null,
      atendimento: vinculoInicial?.tipo === "atendimento" ? vinculoInicial : null,
    };
  });
  const [confirmandoRemocao, setConfirmandoRemocao] = useState(false);
  const toast = useToast();

  /** A coluna que vai ser SALVA, derivada em vez de guardada.
   *
   * Guardada, ela ficava errada em dois momentos: enquanto o quadro ainda
   * vinha (o estado nascia vazio e nada o preenchia depois -- Salvar ficava
   * travado até a pessoa escolher à mão) e depois de trocar de subgrupo (a
   * coluna escolhida era de outro quadro). Derivar resolve os dois com a
   * mesma linha: se a coluna não está NESTE quadro, vale a primeira dele. */
  const colunaEscolhida = colunas.some((c) => c.coluna_id === colunaId)
    ? colunaId
    : colunas[0]?.coluna_id ?? "";

  /** Trocar de subgrupo joga fora o que era do subgrupo anterior.
   *
   * A coluna se resolve sozinha por `colunaEscolhida`; o responsável não --
   * ele precisa ser zerado, senão alguém do subgrupo antigo seguiria
   * escolhido e o salvamento falharia em `_validar_responsavel`. */
  function trocarSubgrupo(novo: string) {
    setSubgrupoId(novo);
    setResponsavel("");
  }

  /** Quem está na lista + quem JÁ é o responsável, mesmo que tenha saído do
   * subgrupo. Sem essa segunda parte, abrir a tarefa de alguém que saiu
   * mostraria "Sem responsável" e salvar apagaria a atribuição em silêncio.
   *
   * 🔴 E com o NOME de quem saiu, não o e-mail cru: a tarefa passou a trazer
   * `responsavel_nome` junto. Quem saiu do subgrupo não está na lista de
   * membros -- era exatamente o caso em que a etiqueta caía pro e-mail, e é
   * o caso em que a pessoa mais precisa reconhecer de quem se trata. */
  const opcoesDeResponsavel = [
    { value: "", label: "Sem responsável" },
    ...membros.map((m) => ({ value: m.email, label: m.apelido || m.email })),
    ...(responsavel && !membros.some((m) => m.email === responsavel)
      ? [{ value: responsavel, label: tarefa?.responsavel_nome ?? responsavel }]
      : []),
  ];

  /** Os dois campos do vínculo, do jeito que a API espera: um preenchido e
   * o outro `null`. `null` explícito, e não omitido, porque é assim que se
   * DESFAZ um vínculo num PATCH parcial. */
  const camposDoVinculo = {
    processo_numero: vinculos.processo?.id ?? null,
    atendimento_id: vinculos.atendimento?.id ?? null,
  };

  const salvarMutation = useMutation({
    mutationFn: () =>
      editando && tarefa
        ? atualizarTarefa(tarefa.subgrupo_id, tarefa.tarefa_id, {
            titulo: titulo.trim(),
            data,
            coluna_id: colunaEscolhida,
            prioridade,
            responsavel_id: responsavel || null,
            ...camposDoVinculo,
          })
        : criarTarefa({
            subgrupo_id: subgrupoId,
            titulo: titulo.trim(),
            data,
            coluna_id: colunaEscolhida,
            prioridade,
            responsavel_id: responsavel || null,
            ...camposDoVinculo,
          }),
    onSuccess: () => {
      toast.sucesso(editando ? "Tarefa atualizada." : "Tarefa criada.");
      onSalvo();
      onFechar();
    },
    onError: (err) => toastErroMutation(toast, err, "Não foi possível salvar a tarefa."),
  });

  const removerMutation = useMutation({
    mutationFn: () => removerTarefa(tarefa!.subgrupo_id, tarefa!.tarefa_id),
    onSuccess: () => {
      toast.sucesso("Tarefa excluída.");
      onSalvo();
      onFechar();
    },
    onError: (err) => toastErroMutation(toast, err, "Não foi possível excluir."),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    salvarMutation.mutate();
  }

  return (
    <>
      <Modal
        descarte="semFormulario"
      titulo={editando ? "Editar tarefa" : "Nova tarefa"}
      onFechar={onFechar}
      rodape={
        <RodapeDeAcoes>
          {editando && (
            <Botao
              variante="perigoContorno"
              mr="auto"
              disabled={removerMutation.isPending}
              /* Passa pelo diálogo como TODA exclusão do sistema. Era a
                 única que não passava: um clique só, sem volta, e cujo
                 único retorno era o botão ficar desabilitado com o mesmo
                 rótulo -- parecia não ter feito nada. */
              onClick={() => setConfirmandoRemocao(true)}
            >
              {removerMutation.isPending ? "Excluindo…" : "Excluir"}
            </Botao>
          )}
          <BotaoDeCancelar />
          <Botao
            type="submit"
            form={idFormulario}
            disabled={salvarMutation.isPending || !titulo.trim() || !colunaEscolhida}
          >
            {salvarMutation.isPending ? "Salvando…" : "Salvar"}
          </Botao>
        </RodapeDeAcoes>
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
              carregando={quadroQuery.isPending}
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
          confirmando={removerMutation.isPending}
          onConfirmar={() => removerMutation.mutate()}
          onFechar={() => setConfirmandoRemocao(false)}
        />
      )}
    </>
  );
}
