import { Box, Input, Stack } from "@chakra-ui/react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  Botao,
  BotaoDeCancelar,
  Campo,
  CampoComCadeado,
  LinhaDeCampos,
  Modal,
  MultiSelect,
  RodapeDeAcoes,
  Select,
  useToast,
} from "../../../../components";
import { ESCOLHA_UM_SUBGRUPO, FALHOU_AO_CONFERIR_SUBGRUPOS, HIERARQUIA_PAPEIS, NOME_PAPEL, PAPEIS_CONVIDAVEIS, TAMANHO_MAXIMO_DO_APELIDO, UFS } from "../../../../constants";
import InterruptorDaImportacao from "../../../PerfilPage/components/InterruptorDaImportacao";
import { DicaDeCampo } from "../../../../components";
import {
  atualizarMembro,
  getGrupoId,
  lerMembro,
  listarTodosOsMembrosDoGrupo,
  listarSubgruposDoGrupo,
} from "../../../../services";
import { toastErroMutation, useToastOnQueryError } from "../../../../services/queryClient";
import { qk } from "../../../../services/queryKeys";
import type { Grupo, Membro, MembroEditavel, Papel } from "../../../../types";
import type {
  RespostaDeMembros,
  RespostaDeSubgrupos,
} from "../../../../types/respostas";

interface EditarMembroFormProps {
  membro: Membro;
  grupos: Grupo[];
  /** Só o operador da plataforma move gente entre grupos e cria
   * `super_admin`. Para `admin`, o campo Grupo fica travado no próprio e o
   * seletor de papel para em `admin`.
   *
   * ⚠️ Travar na tela é conveniência: o servidor recusa igual. */
  podeMoverEntreGrupos: boolean;
  onAtualizado: () => void;
  onFechar: () => void;
}

export default function EditarMembroForm({
  membro, grupos, podeMoverEntreGrupos, onAtualizado, onFechar,
}: EditarMembroFormProps) {
  /** Liga o botão do rodapé ao `<form>` do corpo pelo atributo `form` --
   * eles são irmãos, não pai e filho, porque o rodapé fica fora da área que
   * rola. `useId` e não uma constante: dois modais abertos ao mesmo tempo
   * teriam o mesmo id literal, e o botão de um enviaria o formulário do
   * outro. */
  const idFormulario = useId();
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
    setNumeroOab(d.numero_oab ?? "");
    setUfOab(d.uf_oab ?? "");
    setImportacaoLigada(d.importacao_automatica);
    setDestino(d.subgrupos_destino[0] ?? "");
  }, [editavelQuery.data]);

  /* A inscrição que VALERÁ depois de salvar -- a digitada. Cadastrar a OAB e
     ligar a importação num "Salvar" só é aceito pelo servidor. */
  const temInscricao = Boolean(numeroOab.trim() && ufOab);
  /* Com um subgrupo marcado só, o destino é ele -- senão "ligar" iria ao
     servidor sem destino e voltaria recusado. */
  const destinoEfetivo =
    subgruposSelecionados.length === 1 ? subgruposSelecionados[0] : destino;

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
    atualizarMutation.mutate();
  }

  const semSubgrupo = subgruposCarregados && subgruposSelecionados.length === 0;

  return (
    <Modal
      descarte="semFormulario"
      titulo="Editar membro"
      onFechar={onFechar}
      rodape={
        <RodapeDeAcoes>
          <BotaoDeCancelar />
          <Botao
            type="submit"
            form={idFormulario}
            disabled={
              atualizarMutation.isPending ||
              !subgruposCarregados ||
              semSubgrupo ||
              falhouAoRecarregar
            }
          >
            {atualizarMutation.isPending ? "Salvando…" : "Salvar"}
          </Botao>
        </RodapeDeAcoes>
      }
    >
      <form id={idFormulario} onSubmit={handleSubmit}>
        <Stack gap="16px">
          {/* ⚠️ O mesmo "i" do perfil, com o texto na TERCEIRA pessoa: lá é
              "sua inscrição… que ela é sua", e aqui quem edita é outro. Mesma
              correção que as cinco mensagens do servidor receberam.

              🔴 E ele importa mais aqui do que lá: o admin não sabe, ao
              digitar, que o nome dele vai ser conferido contra o tribunal --
              sem o "i", a recusa chegaria sem aviso prévio. */}
          <Campo
            rotulo="Nome completo"
            para="apelido-membro"
            aposORotulo={
              <DicaDeCampo rotulo="Por que o nome completo importa">
                <Box as="strong" color="fg" display="block" mb="6px">
                  Por que o nome completo importa
                </Box>
                Ele é o que o sistema vai comparar com o nome que o tribunal devolve
                para a inscrição na OAB desta pessoa, para confirmar que a inscrição
                é dela.
              </DicaDeCampo>
            }
          >
            <Input
              id="apelido-membro"
              value={apelido}
              onChange={(e) => setApelido(e.target.value)}
              maxLength={TAMANHO_MAXIMO_DO_APELIDO}
              autoFocus
            />
          </Campo>

          {/* O e-mail é a identidade da pessoa no sistema -- trocá-lo seria
              outra pessoa. Fica visível pra confirmar quem se está editando,
              com o cadeado dizendo por que não dá pra mexer. */}
          <Campo rotulo="E-mail" para="email-membro">
            <CampoComCadeado>
              <Input id="email-membro" value={membro.email} disabled pr="38px" />
            </CampoComCadeado>
          </Campo>

          <LinhaDeCampos>
            <Campo rotulo="Papel" para="papel-membro">
              <Select
                id="papel-membro"
                /* ⚠️ Sem `super_admin` para quem não é: o servidor recusa "papel acima do
                   seu", e oferecer a opção seria convidar para um erro. */
                opcoes={(podeMoverEntreGrupos ? HIERARQUIA_PAPEIS : PAPEIS_CONVIDAVEIS)
                  .map((p) => ({ value: p, label: NOME_PAPEL[p] }))}
                valor={papelSelecionado}
                onMudar={(v) => setPapelSelecionado(v as Papel)}
              />
            </Campo>
            <Campo rotulo="Grupo" para="grupo-membro">
              <Select
                id="grupo-membro"
                /* ⚠️ Para `admin` a lista vem VAZIA (`GET /grupos` é
                   `super_admin`-only e nem é chamada), então o próprio grupo
                   é oferecido como única opção -- um seletor vazio e travado
                   não diria onde a pessoa está. */
                opcoes={podeMoverEntreGrupos
                  ? grupos.map((g) => ({ value: g.grupo_id, label: g.nome }))
                  : [{ value: grupoProprioId, label: "Meu grupo" }]}
                valor={grupoSelecionado}
                onMudar={handleMudarGrupo}
                desabilitado={!podeMoverEntreGrupos}
              />
            </Campo>
          </LinhaDeCampos>

          <Campo
            rotulo="Subgrupos"
            para="subgrupos-membro"
            obrigatorio
            dica={ESCOLHA_UM_SUBGRUPO}
            erro={
              falhouAoRecarregar
                ? FALHOU_AO_CONFERIR_SUBGRUPOS
                : semSubgrupo
                  ? ESCOLHA_UM_SUBGRUPO
                  : undefined
            }
          >
            <MultiSelect
              id="subgrupos-membro"
              opcoes={subgruposDoGrupo.map((s) => ({ value: s.subgrupo_id, label: s.nome }))}
              selecionados={subgruposSelecionados}
              onMudar={setSubgruposSelecionados}
              placeholder="Selecione os subgrupos"
              /* Duas esperas, e as duas enganam: as OPÇÕES vêm da consulta,
                 e a SELEÇÃO atual vem do `listarTodosOsMembrosDoGrupo` de cima.
                 Sem as duas o seletor aparecia vazio, como se a pessoa não
                 estivesse em subgrupo nenhum -- e o Salvar travado sem
                 dizer por quê. */
              carregando={subgruposDoGrupoQuery.isPending || !subgruposCarregados}
            />
          </Campo>

          {/* 🔴 A inscrição da OAB desta pessoa (Fase 1b, `admin`+).
              Existe para destravar o admin: a titularidade passou a ser
              conferida também quando o NOME muda, e sem estes campos ele
              travaria ao corrigir um nome, sem como limpar a OAB de outro. */}
          {/* ⚠️ **Sem divisória, e sem espaçamento próprio.** O `Stack` do
              formulário já dá `gap="16px"` entre todas as linhas; uma régua
              aqui faria ESTA fronteira parecer mais importante que as
              outras, e acabou lida como sublinhado do bloco de cima. */}
          <LinhaDeCampos>
            <Campo rotulo="Número da OAB" para="numero-oab-membro">
              <Input
                id="numero-oab-membro"
                value={numeroOab}
                onChange={(e) => setNumeroOab(e.target.value)}
                inputMode="numeric"
                placeholder="Só os dígitos"
              />
            </Campo>
            <Campo rotulo="UF" para="uf-oab-membro">
              <Select
                id="uf-oab-membro"
                /* 🔴 A opção vazia é EXPLÍCITA, como no perfil: é o vazio
                   nas DUAS partes que apaga a inscrição, e sem ela quem
                   escolhesse uma UF nunca mais voltaria ao vazio. */
                opcoes={[{ value: "", label: "Nenhuma" },
                         ...UFS.map((uf) => ({ value: uf, label: uf }))]}
                valor={ufOab}
                onMudar={setUfOab}
                largura="120px"
              />
            </Campo>
          </LinhaDeCampos>

          <InterruptorDaImportacao
            ligada={importacaoLigada}
            aoMudarLigada={setImportacaoLigada}
            /* 🔴 Os subgrupos MARCADOS AGORA, não os salvos: é a mesma tela
               que os edita, e o servidor valida contra este PATCH. Assim não
               dá para escolher um destino que o salvamento invalidaria. */
            subgrupos={subgruposDoGrupo
              .filter((s) => subgruposSelecionados.includes(s.subgrupo_id))
              .map((s) => ({ id: s.subgrupo_id, nome: s.nome }))}
            destino={destinoEfetivo}
            aoMudarDestino={setDestino}
            temInscricao={temInscricao}
            desabilitado={atualizarMutation.isPending}
            deTerceiro
            compacto
          />
        </Stack>
      </form>
    </Modal>
  );
}
