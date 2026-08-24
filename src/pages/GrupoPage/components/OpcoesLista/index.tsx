import { Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import {
  CartaoDeTabela,
  EstadoVazio,
  EstadoDeErro,
  Esqueleto,
  ModalDeConfirmacao,
  useToast,
} from "../../../../components";
import { TETO_POR_PAGINA } from "../../../../constants";
import {
  atualizarOpcaoProcesso,
  criarOpcaoProcesso,
  desativarOpcaoProcesso,
  listarOpcoesProcesso,
  papelAtende,
  reativarOpcaoProcesso,
} from "../../../../services";
import { toastErroMutation, useToastOnQueryError } from "../../../../services/queryClient";
import { qk } from "../../../../services/queryKeys";
import { calcularOrdemAposMover } from "../../../../utils";
import FormularioNovaOpcao from "../FormularioNovaOpcao";
import LinhaDeOpcao from "../LinhaDeOpcao";
import type { OpcaoProcesso, TipoOpcaoProcesso } from "../../../../types";
import type { RenomearOpcao } from "../../types";
import type {
  RespostaDeOpcoesPaginada,
} from "../../../../types/respostas";

interface OpcoesListaProps {
  tipo: TipoOpcaoProcesso;
  /** "Fases" / "Situações", pras mensagens de erro. */
  titulo: string;
  /** "fase" / "situação" -- vira "Nova fase" no campo e "Desativar fase" no
   * diálogo. */
  nomeSingular: string;
}

/** CRUD de uma lista (Fases OU Situações).
 *
 * Ao contrário do seletor do processo, que só mostra as ativas, esta tela
 * lista TODAS, inclusive as inativas, com ação de reativar -- desativar aqui
 * é soft delete (`ativo`), e não exclusão.
 *
 * A ordem é por arrastar, e não dá pra arrastar entre páginas: a lista vem
 * inteira com `TETO_POR_PAGINA` em vez de paginar. Mesma premissa do
 * seletor de Fase/Situação do formulário de processo.
 */
export default function OpcoesLista({ tipo, titulo, nomeSingular }: OpcoesListaProps) {
  const [renomeandoId, setRenomeandoId] = useState<string | null>(null);
  const [paraDesativar, setParaDesativar] = useState<OpcaoProcesso | null>(null);
  const [erroAoCriar, setErroAoCriar] = useState("");
  const [ordemLocal, setOrdemLocal] = useState<OpcaoProcesso[] | null>(null);
  const toast = useToast();
  const queryClient = useQueryClient();

  const podeGerenciar = papelAtende("admin");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const query = useQuery<RespostaDeOpcoesPaginada>({
    queryKey: qk.opcoesProcesso(tipo, { tamanhoPagina: TETO_POR_PAGINA }),
    queryFn: () => listarOpcoesProcesso(tipo, { tamanhoPagina: TETO_POR_PAGINA }),
  });
  useToastOnQueryError(query.error, `Não foi possível carregar ${titulo.toLowerCase()}.`);
  const opcoesServidor = [...(query.data?.opcoes || [])].sort((a, b) => a.ordem - b.ordem);
  const opcoes = ordemLocal ?? opcoesServidor;

  function invalidar() {
    // 🔴 PREFIXO, não `qk.opcoesProcesso(tipo)`.
    //
    // Aquela é `["opcoesProcesso", tipo, {}]`, e o `partialMatchKey` compara
    // o terceiro elemento: `{}` casa com `{pagina:1}` da listagem paginada,
    // mas não com a string `"todos"` de `qk.todasAsOpcoes`. Resultado:
    // renomear ou desativar uma fase não atualizava a tabela de Processos
    // nem o select de "Novo processo" -- só a lista da própria tela.
    queryClient.invalidateQueries({ queryKey: qk.prefixoOpcoesProcesso(tipo) });
  }

  const criarMutation = useMutation({
    // Maior `ordem` já em memória, e não `total`: desde que `ordem` virou
    // fracionária, um item arrastado pro fim pode ter `ordem` maior que a
    // contagem de itens -- `total + 1` nasceria empatado ou atrás do que
    // deveria ser o último.
    mutationFn: (rotulo: string) =>
      criarOpcaoProcesso(tipo, rotulo, Math.max(0, ...opcoes.map((o) => o.ordem)) + 1),
    onSuccess: () => {
      setErroAoCriar("");
      invalidar();
    },
    onError: (err) => {
      setErroAoCriar("Não foi possível criar. Confira o texto.");
      toastErroMutation(toast, err, "Não foi possível criar.");
    },
  });

  const renomearMutation = useMutation({
    // Só o rótulo -- reenviar a `ordem` sobrescreveria um arrastar
    // concorrente com um valor possivelmente desatualizado.
    mutationFn: ({ id, rotulo }: RenomearOpcao) =>
      atualizarOpcaoProcesso(tipo, id, rotulo),
    onSuccess: invalidar,
    onError: (err) => toastErroMutation(toast, err, "Não foi possível renomear."),
    onSettled: () => setRenomeandoId(null),
  });

  const desativarMutation = useMutation({
    mutationFn: (id: string) => desativarOpcaoProcesso(tipo, id),
    onSuccess: invalidar,
    onError: (err) => toastErroMutation(toast, err, "Não foi possível desativar."),
    onSettled: () => setParaDesativar(null),
  });

  const reativarMutation = useMutation({
    mutationFn: (id: string) => reativarOpcaoProcesso(tipo, id),
    onSuccess: invalidar,
    onError: (err) => toastErroMutation(toast, err, "Não foi possível reativar."),
  });

  /** Um PATCH por arrastada: só o item movido ganha `ordem` nova (o ponto
   * médio entre os vizinhos no destino), os demais nem são tocados. */
  const reordenarMutation = useMutation({
    mutationFn: (opcao: OpcaoProcesso) =>
      atualizarOpcaoProcesso(tipo, opcao.opcao_id, undefined, opcao.ordem),
    onSuccess: invalidar,
    onError: (err) => {
      setOrdemLocal(null);
      invalidar();
      toastErroMutation(toast, err, "Não foi possível reordenar.");
    },
  });

  /** ⚠️ Sem o guard de `isPending`, um refetch em segundo plano (de causa
   * qualquer, não do PATCH deste reorder) que chegue enquanto o PATCH ainda
   * está em voo apagaria o carimbo otimista de `ordemLocal` antes da
   * confirmação -- a lista voltaria à ordem antiga por um instante.
   *
   * `isPending` NÃO entra nas deps de propósito: o efeito só precisa rodar
   * quando `query.data` mudar de verdade (inclusive quando essa mudança é o
   * refetch disparado pelo próprio `onSuccess`), e aí a closure já lê o
   * `isPending` mais recente. Nas deps, ele rodaria assim que virasse
   * `false` -- o que acontece ANTES de o refetch chegar, já que `invalidar()`
   * não é aguardado -- e apagaria `ordemLocal` cedo demais, que é exatamente
   * a corrida que este guard existe pra evitar. */
  useEffect(() => {
    if (reordenarMutation.isPending) return;
    setOrdemLocal(null);
  }, [query.data]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    // ⚠️ Sem este guard, uma 2ª arrastada iniciada antes de o PATCH da 1ª
    // confirmar reusaria a mesma mutation: se o 2º PATCH assentasse antes do
    // 1º, `isPending` viraria `false` com o 1º ainda em voo, e um refetch
    // concorrente nesse instante furaria o guard do efeito acima.
    if (!over || active.id === over.id || reordenarMutation.isPending) return;
    const oldIndex = opcoes.findIndex((o) => o.opcao_id === active.id);
    const newIndex = opcoes.findIndex((o) => o.opcao_id === over.id);
    const movido = arrayMove(opcoes, oldIndex, newIndex);
    const novaOrdem = calcularOrdemAposMover(movido[newIndex - 1], movido[newIndex + 1]);
    // Carimba o valor novo no item movido -- sem isso, renomeá-lo logo em
    // seguida (antes do refetch) reenviaria a `ordem` velha e desfaria o
    // reorder recém-salvo.
    const opcaoMovida = { ...movido[newIndex], ordem: novaOrdem };
    setOrdemLocal(movido.map((o, i) => (i === newIndex ? opcaoMovida : o)));
    reordenarMutation.mutate(opcaoMovida);
  }

  if (query.isPending) return <Esqueleto linhas={3} />;
  if (query.isError) {
    return (
      <CartaoDeTabela>
        <EstadoDeErro
          mensagem={`Não foi possível carregar ${titulo.toLowerCase()}.`}
          onTentarDeNovo={() => query.refetch()}
          tentando={query.isFetching}
        />
      </CartaoDeTabela>
    );
  }

  return (
    <>
      <CartaoDeTabela>
        {podeGerenciar ? (
          <FormularioNovaOpcao
            nomeSingular={nomeSingular}
            enviando={criarMutation.isPending}
            erro={erroAoCriar || undefined}
            onCriar={(rotulo) => criarMutation.mutate(rotulo)}
          />
        ) : (
          <Text
            p="4px 4px 14px"
            mb="4px"
            borderBottomWidth="1px"
            borderBottomColor="border.subtle"
            fontSize="11.5px"
            color="fg.subtle"
          >
            {`Só admin e super admin podem gerenciar ${titulo.toLowerCase()}.`}
          </Text>
        )}

        {opcoes.length === 0 ? (
          <EstadoVazio mensagem="Nenhuma opção ainda." />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={opcoes.map((o) => o.opcao_id)}
              strategy={verticalListSortingStrategy}
            >
              {opcoes.map((o) => (
                <LinhaDeOpcao
                  key={o.opcao_id}
                  opcao={o}
                  /* `variables` diz QUAL opção está em voo -- as três
                     mutations levam o `opcao_id`, então dá pra apontar a
                     linha certa em vez de travar a lista inteira. */
                  emAndamento={
                    (reativarMutation.isPending && reativarMutation.variables === o.opcao_id) ||
                    (renomearMutation.isPending && renomearMutation.variables?.id === o.opcao_id) ||
                    (desativarMutation.isPending && desativarMutation.variables === o.opcao_id)
                  }
                  podeGerenciar={podeGerenciar}
                  editando={renomeandoId === o.opcao_id}
                  onIniciarRenome={() => setRenomeandoId(o.opcao_id)}
                  onRenomear={(rotulo) => renomearMutation.mutate({ id: o.opcao_id, rotulo })}
                  onCancelarRenome={() => setRenomeandoId(null)}
                  onDesativar={() => setParaDesativar(o)}
                  onReativar={() => reativarMutation.mutate(o.opcao_id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </CartaoDeTabela>

      {paraDesativar && (
        <ModalDeConfirmacao
          titulo={`Desativar ${nomeSingular}`}
          mensagem={
            <>
              <strong>{paraDesativar.rotulo}</strong> deixa de aparecer como opção nova.
            </>
          }
          /* O medo aqui é perder dado, e não é isso que acontece: quem já usa
             a opção continua mostrando o valor. */
          aviso="Os processos que já usam essa opção continuam mostrando o valor. Nada é perdido."
          rotulo="Desativar"
          /* Reversível: existe "Reativar" na mesma tela. Some a lixeira e o
             "não pode ser desfeita", que aqui seriam mentira. */
          reversivel
          confirmando={desativarMutation.isPending}
          onConfirmar={() => desativarMutation.mutate(paraDesativar.opcao_id)}
          onFechar={() => setParaDesativar(null)}
        />
      )}
    </>
  );
}
