import { Box, Input, Stack } from "@chakra-ui/react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import {
  Botao,
  Campo,
  IconeCadeado,
  LinhaDeCampos,
  Modal,
  MultiSelect,
  RodapeDeAcoes,
  Select,
  useToast,
} from "../../../../components";
import { HIERARQUIA_PAPEIS, NOME_PAPEL } from "../../../../constants";
import {
  atualizarMembro,
  getGrupoId,
  listarMembrosDoGrupo,
  listarSubgruposDoGrupo,
} from "../../../../services";
import { toastErroMutation, useToastOnQueryError } from "../../../../services/queryClient";
import { qk } from "../../../../services/queryKeys";
import type { Grupo, Membro, Papel, Subgrupo } from "../../../../types";

interface Props {
  membro: Membro;
  grupos: Grupo[];
  onAtualizado: () => void;
  onFechar: () => void;
}

export default function EditarMembroForm({ membro, grupos, onAtualizado, onFechar }: Props) {
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
  const grupoAlteradoRef = useRef(false);
  const toast = useToast();

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
    listarMembrosDoGrupo()
      .then((d: { membros: Membro[] }) => {
        if (grupoAlteradoRef.current) return;
        const fresco = d.membros.find((m) => m.email === membro.email);
        if (fresco) setSubgruposSelecionados(fresco.subgrupos || []);
      })
      .finally(() => setSubgruposCarregados(true));
  }, [membro.email]);

  const subgruposDoGrupoQuery = useQuery<{ subgrupos: Subgrupo[] }>({
    queryKey: qk.subgruposDoGrupo(grupoSelecionado),
    queryFn: () => listarSubgruposDoGrupo(grupoSelecionado),
  });
  useToastOnQueryError(
    subgruposDoGrupoQuery.error,
    "Não foi possível carregar os subgrupos desse grupo."
  );
  const subgruposDoGrupo = subgruposDoGrupoQuery.data?.subgrupos || [];

  const atualizarMutation = useMutation({
    mutationFn: () =>
      atualizarMembro(membro.email, {
        apelido: apelido.trim(),
        grupo_id: grupoSelecionado,
        papel: papelSelecionado,
        subgrupos: subgruposSelecionados,
      }),
    onSuccess: () => {
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
    toast.sucesso("Grupo trocado — selecione os subgrupos desse grupo.");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    atualizarMutation.mutate();
  }

  const semSubgrupo = subgruposCarregados && subgruposSelecionados.length === 0;

  return (
    <Modal
      titulo="Editar membro"
      onFechar={onFechar}
      rodape={
        <RodapeDeAcoes>
          <Botao variante="ghost" onClick={onFechar}>
            Cancelar
          </Botao>
          <Botao
            type="submit"
            form={idFormulario}
            disabled={atualizarMutation.isPending || !subgruposCarregados || semSubgrupo}
          >
            {atualizarMutation.isPending ? "Salvando…" : "Salvar"}
          </Botao>
        </RodapeDeAcoes>
      }
    >
      <form id={idFormulario} onSubmit={handleSubmit}>
        <Stack gap="16px">
          <Campo rotulo="Apelido" para="apelido-membro">
            <Input
              id="apelido-membro"
              value={apelido}
              onChange={(e) => setApelido(e.target.value)}
              maxLength={512}
              autoFocus
            />
          </Campo>

          {/* O e-mail é a identidade da pessoa no sistema -- trocá-lo seria
              outra pessoa. Fica visível pra confirmar quem se está editando,
              com o cadeado dizendo por que não dá pra mexer. */}
          <Campo rotulo="E-mail" para="email-membro">
            <Box position="relative">
              <Input id="email-membro" value={membro.email} disabled pr="38px" />
              <Box
                position="absolute"
                right="12px"
                top="50%"
                transform="translateY(-50%)"
                color="fg.subtle"
                css={{ "& svg": { width: "15px", height: "15px" } }}
              >
                <IconeCadeado />
              </Box>
            </Box>
          </Campo>

          <LinhaDeCampos>
            <Campo rotulo="Papel" para="papel-membro">
              <Select
                id="papel-membro"
                opcoes={HIERARQUIA_PAPEIS.map((p) => ({ value: p, label: NOME_PAPEL[p] }))}
                valor={papelSelecionado}
                onMudar={(v) => setPapelSelecionado(v as Papel)}
              />
            </Campo>
            <Campo rotulo="Grupo" para="grupo-membro">
              <Select
                id="grupo-membro"
                opcoes={grupos.map((g) => ({ value: g.grupo_id, label: g.nome }))}
                valor={grupoSelecionado}
                onMudar={handleMudarGrupo}
              />
            </Campo>
          </LinhaDeCampos>

          <Campo
            rotulo="Subgrupos"
            para="subgrupos-membro"
            obrigatorio
            /* Mesma explicação do convite: é o subgrupo que decide o que a
               pessoa enxerga, e sem nenhum ela fica com conta ativa e
               inútil. */
            dica="O subgrupo define quais processos a pessoa vai ver — escolha pelo menos um."
            erro={semSubgrupo ? "Escolha pelo menos um subgrupo." : undefined}
          >
            <MultiSelect
              id="subgrupos-membro"
              opcoes={subgruposDoGrupo.map((s) => ({ value: s.subgrupo_id, label: s.nome }))}
              selecionados={subgruposSelecionados}
              onMudar={setSubgruposSelecionados}
              placeholder="Selecione os subgrupos"
            />
          </Campo>
        </Stack>
      </form>
    </Modal>
  );
}
