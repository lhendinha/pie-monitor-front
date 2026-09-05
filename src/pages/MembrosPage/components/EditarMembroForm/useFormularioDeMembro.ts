/** O estado, as leituras e a mutação do formulário de editar membro -- o
 * `EditarMembroForm` fica só com o JSX.
 *
 * ➡️ Os testes de `EditarMembroForm/index.test.tsx` cobrem os dois juntos.
 */
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useToast } from "../../../../contexts/ToastContext";
import {
  atualizarMembro,
  getGrupoId,
  lerMembro,
  listarTodosOsMembrosDoGrupo,
  listarSubgruposDoGrupo,
} from "../../../../services";
import { toastErroMutation, useToastOnQueryError } from "../../../../services/queryClient";
import { useGuardaDeDescarte } from "../../../../hooks/useGuardaDeDescarte";
import { qk } from "../../../../services/queryKeys";
import type { Membro, MembroEditavel, Papel } from "../../../../types";
import type {
  RespostaDeMembros,
  RespostaDeSubgrupos,
} from "../../../../types/respostas";

/** As props de `EditarMembroForm` que o formulário usa -- todas menos a
 * lista de grupos e a permissão de mover, que só a tela lê. */
export interface OpcoesDoFormularioDeMembro {
  membro: Membro;
  onAtualizado: () => void;
  onFechar: () => void;
}

export function useFormularioDeMembro({ membro, onAtualizado, onFechar }: OpcoesDoFormularioDeMembro) {
  const grupoProprioId = getGrupoId() || "";
  const [apelido, setApelido] = useState(membro.apelido || "");
  const [grupoSelecionado, setGrupoSelecionado] = useState(grupoProprioId);
  const [papelSelecionado, setPapelSelecionado] = useState<Papel>(membro.papel || "user");
  const [subgruposSelecionados, setSubgruposSelecionados] = useState<string[]>(
    membro.subgrupos || []
  );
  const [subgruposCarregados, setSubgruposCarregados] = useState(false);
  /** A leitura fresca FALHOU. Sem ela, o conjunto de subgrupos na tela pode
   * estar velho -- e salvar por cima remove participação que alguém acabou
   * de criar. Melhor travar e dizer.
   *
   * ⚠️ Não cobre "não achou a pessoa", apesar de a versão anterior deste
   * texto dizer que sim. Aquele caso é SUCESSO da rede e está tratado no
   * `.then`, com o motivo escrito lá: se ela realmente saiu do grupo,
   * reabrir o modal dá o mesmo resultado, então travar não recupera nada.
   * Duas descrições contraditórias do mesmo sinalizador, no mesmo arquivo. */
  const [falhouAoRecarregar, setFalhouAoRecarregar] = useState(false);
  const [numeroOab, setNumeroOab] = useState("");
  const [ufOab, setUfOab] = useState("");
  const [importacaoLigada, setImportacaoLigada] = useState(false);
  const [destino, setDestino] = useState("");
  const grupoAlteradoRef = useRef(false);
  const toast = useToast();
  const queryClient = useQueryClient();

  const temInscricao = Boolean(numeroOab.trim() && ufOab);
  /* Com um subgrupo marcado só, o destino é ele -- senão "ligar" iria ao
     servidor sem destino e voltaria recusado. */
  const destinoEfetivo =
    subgruposSelecionados.length === 1 ? subgruposSelecionados[0] : destino;

  /* A projeção é o corpo do PATCH. `destinoEfetivo` e não `destino`, e a
     lista de destino só quando ligada -- é o que o envio manda.

     ⚠️ Ficam FORA `subgruposCarregados` e `falhouAoRecarregar`: sinais de UI. */
  /* ⚠️ SEM `pronto`, e a razão é específica daqui: as duas semeaduras chamam
     `resemear` no MESMO lote que os `setState` delas -- dentro do `.then` e
     dentro do efeito. O React agrupa tudo numa renderização só, então o
     retrato e os campos mudam juntos e não existe a fresta de um render que o
     `ModalDeDocumento` tem (lá o efeito reage a um valor DERIVADO, que só
     muda no render seguinte à resposta).
     Tentei um gate aqui e ele não era guardado por teste nenhum, nem na suíte
     cheia -- porque não havia o que guardar. */
  const { mudou, resemear } = useGuardaDeDescarte({
      apelido: apelido.trim(),
      grupo: grupoSelecionado,
      papel: papelSelecionado,
      subgrupos: subgruposSelecionados,
      numeroOab: numeroOab.trim(),
      ufOab,
      importacaoLigada,
      destino: importacaoLigada ? destinoEfetivo : "",
  });

  /** Anti-staleness: `membro.subgrupos` (prop) pode estar desatualizado se
   * alguém mexeu nos subgrupos dessa pessoa pela seção "Membros por
   * subgrupo" sem recarregar -- busca fresco antes de liberar o envio,
   * senão a reconciliação do servidor (que substitui pelo conjunto exato
   * enviado) desfaria uma adição recente.
   *
   * Fica fora do React Query de propósito: precisa de uma resposta de rede
   * genuína (não pode vir do cache compartilhado da query `membros`) e
   * descarta o resultado via `ref` mutável se a pessoa já trocou de grupo
   * enquanto isso -- não se encaixa no modelo declarativo do `useQuery`. */
  useEffect(() => {
    listarTodosOsMembrosDoGrupo()
      .then((d: RespostaDeMembros) => {
        // 🔴 O flag é liberado ANTES do `return` antecipado.
        //
        // Trocar o Grupo enquanto esta busca estava em voo fazia os dois
        // ramos saírem sem nunca marcar `subgruposCarregados` -- e aí o
        // "Salvar" ficava desabilitado e o MultiSelect em "carregando" pra
        // sempre, até fechar e reabrir o modal. O `ref` existe pra descartar
        // o RESULTADO obsoleto, não pra deixar o formulário travado.
        setSubgruposCarregados(true);
        if (grupoAlteradoRef.current) return;
        const fresco = d.membros.find((m) => m.email === membro.email);
        if (fresco) setSubgruposSelecionados(fresco.subgrupos || []);
        /* 🔴 Avisa o retrato com o MESMO literal que acabou de gravar. Um
           efeito do hook no mesmo commit ainda leria o valor de antes, porque
           o `setState` acima só se aplica no render seguinte.
           ⚠️ Semeia mesmo quando a pessoa NÃO foi encontrada, com o conjunto
           da prop: não achar é caso de sucesso da rede, o retrato certo é o
           que já estava, e deixar de semear prenderia a chave para sempre. */
        resemear("subgruposFrescos", {
          subgrupos: fresco ? fresco.subgrupos || [] : membro.subgrupos || [],
        });
        // ⚠️ Não achar a pessoa é caso de SUCESSO da rede, e a mensagem de
        // "não consegui conferir / feche e abra de novo" não recupera nada
        // aqui: se ela realmente saiu do grupo, reabrir dá o mesmo. Fica com
        // o conjunto que veio na prop e o Salvar segue liberado -- é o
        // comportamento de antes, e o servidor recusa se estiver errado.
        // (sem ação: ver comentário acima)
      })
      // 🔴 O `.catch` faltava, e o `.finally` NÃO converte rejeição -- ela
      // virava unhandled promise rejection e nada aparecia pra pessoa,
      // enquanto `subgruposCarregados` ficava `true` do mesmo jeito e o
      // Salvar destravava com o conjunto VELHO da prop.
      //
      // O servidor reconcilia pelo conjunto exato enviado e, pra cada
      // subgrupo removido, solta as tarefas de quem saiu. Então um blip de
      // rede aqui, num "Editar" aberto só pra corrigir o apelido, tirava a
      // pessoa de um subgrupo que alguém tinha acabado de adicionar -- e as
      // tarefas dela lá ficavam sem responsável. Sem aviso nenhum.
      //
      // É exatamente a falha que o comentário acima descreve como o motivo
      // deste efeito existir.
      .catch(() => {
        setSubgruposCarregados(true);
        if (grupoAlteradoRef.current) return;
        setFalhouAoRecarregar(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recarrega SÓ quando muda a pessoa: `membro.subgrupos` mudar é justamente o que este efeito existe pra não confiar (ver o comentário acima)
  }, [membro.email]);

  const subgruposDoGrupoQuery = useQuery<RespostaDeSubgrupos>({
    queryKey: qk.subgruposDoGrupo(grupoSelecionado),
    queryFn: () => listarSubgruposDoGrupo(grupoSelecionado),
  });
  useToastOnQueryError(
    subgruposDoGrupoQuery.error,
    "Não foi possível carregar os subgrupos desse grupo."
  );
  const subgruposDoGrupo = subgruposDoGrupoQuery.data?.subgrupos || [];

  /* 🔴 A inscrição NÃO vem na listagem, e não pode vir: `GET /grupos/membros`
     é `manager`+ e a projeção dela é fixa de propósito -- publicá-la ali a
     mostraria na tela de Membros, que não pediu por ela. Esta rota é `admin`+,
     o mesmo piso de quem edita. */
  const editavelQuery = useQuery<MembroEditavel>({
    queryKey: qk.membroEditavel(membro.email),
    queryFn: () => lerMembro(membro.email),
  });
  useToastOnQueryError(
    editavelQuery.error,
    "Não foi possível carregar a inscrição desta pessoa."
  );

  /* Os campos nascem do que está salvo -- mesmo arranjo do perfil. Sem isto
     abririam vazios, e um "Salvar" apagaria a inscrição de quem já tem. */
  useEffect(() => {
    const d = editavelQuery.data;
    if (!d) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- semeadura do formulário a partir do que está salvo; o projeto usa `useEffect` pra isso de propósito (decidido em 03/09/2026), ver o comentário acima e o eslint.config.js
    setNumeroOab(d.numero_oab ?? "");
    setUfOab(d.uf_oab ?? "");
    setImportacaoLigada(d.importacao_automatica);
    setDestino(d.subgrupos_destino[0] ?? "");
    /* Os mesmos literais, pela mesma razão da outra semeadura.
       ⚠️ `resemear` deduz por chave, então um refetch -- e `staleTime` é 0 no
       projeto, sem `refetchOnWindowFocus` desligado -- não re-baseia o
       retrato no meio da edição. */
    resemear("inscricaoDaPessoa", {
      numeroOab: (d.numero_oab ?? "").trim(),
      ufOab: d.uf_oab ?? "",
      importacaoLigada: d.importacao_automatica,
      destino: d.importacao_automatica ? d.subgrupos_destino[0] ?? "" : "",
    });
  }, [editavelQuery.data, resemear]);

  /* A inscrição que VALERÁ depois de salvar -- a digitada. Cadastrar a OAB e
     ligar a importação num "Salvar" só é aceito pelo servidor. */

  const atualizarMutation = useMutation({
    mutationFn: () =>
      atualizarMembro(membro.email, {
        apelido: apelido.trim(),
        grupo_id: grupoSelecionado,
        papel: papelSelecionado,
        subgrupos: subgruposSelecionados,
        numero_oab: numeroOab.trim(),
        uf_oab: ufOab,
        /* 🔴 O destino vem dos subgrupos MARCADOS AGORA, não dos salvos --
           é o que torna a contradição impossível: a mesma tela edita os dois,
           e o servidor valida contra este mesmo PATCH. */
        importacao_automatica: importacaoLigada,
        subgrupos_destino: importacaoLigada ? [destinoEfetivo] : [],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.membroEditavel(membro.email) });
      toast.sucesso(`${membro.apelido || membro.email} atualizado.`);
      onAtualizado();
      onFechar();
    },
    onError: (err) => toastErroMutation(toast, err, "Não foi possível atualizar."),
  });

  function handleMudarGrupo(novoGrupoId: string) {
    grupoAlteradoRef.current = true;
    setGrupoSelecionado(novoGrupoId);
    // Subgrupo pertence a um grupo: manter a seleção anterior mandaria pro
    // servidor ids que não existem no grupo novo.
    setSubgruposSelecionados([]);
    /* 🔴 E o bloqueio por falha de recarga sai junto.
     *
     * `falhouAoRecarregar` desabilita o Salvar porque a seleção pode estar
     * desatualizada -- e enviar dado velho REMOVE a pessoa de subgrupos que
     * alguém acabou de adicionar. Mas ele nunca era limpo, e o efeito que o
     * define só reage a `[membro.email]`: depois de um blip de rede, o
     * formulário ficava travado até fechar e reabrir o modal.
     *
     * Trocando o grupo, a seleção antiga é descartada na linha acima -- não
     * há mais dado velho pra enviar, então o motivo do bloqueio deixou de
     * existir. */
    setFalhouAoRecarregar(false);
    toast.sucesso("Grupo trocado — selecione os subgrupos desse grupo.");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    /* 🔴 A trava não pode viver SÓ no `disabled` do botão, e o motivo é a
       forma deste modal: o Salvar é IRMÃO do `<form>`, ligado por
       `form={idFormulario}`. O envio implícito -- Enter num campo de texto --
       passa pelo botão padrão do formulário, e esse caminho o jsdom nem
       executa: medido em 02/09/2026, com o botão HABILITADO o Enter não
       submetia nada aqui. Ou seja, um teste de Enter passaria verde
       independentemente da trava, provando nada.

       Repetir a condição aqui resolve as duas coisas: vale para QUALQUER
       caminho de envio, inclusive os que o navegador tem e o jsdom não, e
       vira uma regra que o teste consegue exercitar de verdade.

       ⚠️ O que ela impede: sem a inscrição carregada `numeroOab` é `""`, e
       `""` nas duas partes é o gesto de APAGAR (`types/requisicoes.ts`). */
    
    if (!editavelQuery.data) return;
    atualizarMutation.mutate();
  }

  const semSubgrupo = subgruposCarregados && subgruposSelecionados.length === 0;

  return {
    grupoProprioId,
    apelido,
    setApelido,
    grupoSelecionado,
    papelSelecionado,
    setPapelSelecionado,
    subgruposSelecionados,
    setSubgruposSelecionados,
    subgruposCarregados,
    falhouAoRecarregar,
    numeroOab,
    setNumeroOab,
    ufOab,
    setUfOab,
    importacaoLigada,
    setImportacaoLigada,
    setDestino,
    temInscricao,
    destinoEfetivo,
    mudou,
    subgruposDoGrupoQuery,
    subgruposDoGrupo,
    editavelQuery,
    salvando: atualizarMutation.isPending,
    handleMudarGrupo,
    handleSubmit,
    semSubgrupo,
  };
}
