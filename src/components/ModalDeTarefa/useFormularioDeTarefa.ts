/** O estado e as mutações do formulário de tarefa -- o `ModalDeTarefa` fica
 * só com o JSX.
 *
 * ➡️ Os testes de `ModalDeTarefa/index.test.tsx` cobrem os dois juntos.
 */
import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { useGuardaDeDescarte } from "../../hooks/useGuardaDeDescarte";
import { useToast } from "../../contexts/ToastContext";
import {
  criarTarefa,
  atualizarTarefa,
  removerTarefa,
  listarQuadro,
  listarMembrosDoSubgrupo,
} from "../../services";
import { toastErroMutation } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import { useSubgruposBuscaveis } from "../../hooks/useOpcoesBuscaveis";
import { hojeISO, mascararNumeroProcesso } from "../../utils";

import type { Tarefa, Vinculo, VinculosDeRegistro } from "../../types";
import type { RespostaDeMembros, RespostaDoQuadro } from "../../types/respostas";

/** As props de `ModalDeTarefa` que o formulário usa -- todas menos o nome
 * do subgrupo, que só a tela mostra. A explicação de cada uma está lá. */
export interface OpcoesDoFormularioDeTarefa {
  tarefa?: Tarefa | null;
  subgrupoAtual: string;
  colunaInicial?: string;
  vinculoInicial?: Vinculo | null;
  dataInicial?: string;
  onSalvo: () => void;
  onFechar: () => void;
}

export function useFormularioDeTarefa({
  tarefa,
  subgrupoAtual,
  colunaInicial,
  vinculoInicial,
  dataInicial,
  onSalvo,
  onFechar,
}: OpcoesDoFormularioDeTarefa) {
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

  /* A projeção é o corpo do envio. `colunaEscolhida` e não `colunaId`, porque
     é o derivado que vai para o servidor -- e é justamente por isso que ele
     precisa do `resemear` logo abaixo.

     ⚠️ `confirmandoRemocao` fica fora: sinal de UI. E os vínculos entram como
     os DOIS ids -- esquecer o `atendimentoId` descartaria em silêncio
     exatamente o vínculo que o envio usa. */
  const { mudou, resemear } = useGuardaDeDescarte({
    titulo: titulo.trim(),
    data,
    subgrupoId,
    coluna: colunaEscolhida,
    prioridade,
    responsavel: responsavel || "",
    processoNumero: vinculos.processo?.id ?? null,
    atendimentoId: vinculos.atendimento?.id ?? null,

  });

  /* 🔴 A coluna padrão vem do QUADRO, não da pessoa.
   *
   * `colunaEscolhida` só encontra a coluna depois que `colunas` chega: até
   * lá ela é `""`, mesmo quando o modal foi aberto de uma coluna específica
   * (`colunaInicial`). Sem avisar o retrato, essa chegada sozinha deixaria a
   * tarefa "alterada" -- e este é o caso-manchete do requisito: abrir uma
   * tarefa pelo Kanban, olhar, e fechar não pode perguntar nada. */
  useEffect(() => {
    if (colunaEscolhida) resemear("colunaDoQuadro", { coluna: colunaEscolhida });
  }, [colunaEscolhida, resemear]);

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

  return {
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
    carregandoQuadro: quadroQuery.isPending,
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
    salvando: salvarMutation.isPending,
    excluindo: removerMutation.isPending,
    excluir: () => removerMutation.mutate(),
    handleSubmit,
  };
}
