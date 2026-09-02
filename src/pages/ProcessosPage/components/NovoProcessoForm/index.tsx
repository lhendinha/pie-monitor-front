import { Input, Stack, Text } from "@chakra-ui/react";
import { useId, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";

import {
  Botao,
  BotaoDeCancelar,
  Campo,
  Esqueleto,
  Modal,
  RodapeDeAcoes,
  Select,
  useToast,
} from "../../../../components";
import { criarProcesso } from "../../../../services";
import { toastErroMutation } from "../../../../services/queryClient";
import { apenasDigitos, mascararNumeroProcesso } from "../../../../utils";
import CamposProcesso from "../CamposProcesso";
import type { Subgrupo } from "../../../../types";
import type { CamposOpcionaisProcesso } from "../../../../types";
import { TAMANHO_MAXIMO_DO_APELIDO_DE_PROCESSO } from "../../../../constants";


interface NovoProcessoFormProps {
  subgrupos: Subgrupo[];
  /** Distingue "ainda não chegou" de "não existe nenhum". Sem isto o modal
   * abria afirmando "Crie um subgrupo primeiro" durante o carregamento --
   * uma frase falsa pra quem tem subgrupos, e pior que não dizer nada. */
  carregandoSubgrupos?: boolean;
  onCadastrado: () => void;
  onFechar: () => void;
}

export default function NovoProcessoForm({
  subgrupos,
  carregandoSubgrupos,
  onCadastrado,
  onFechar,
}: NovoProcessoFormProps) {
  /** Liga o botão do rodapé ao `<form>` do corpo pelo atributo `form` --
   * eles são irmãos, não pai e filho, porque o rodapé fica fora da área que
   * rola. `useId` e não uma constante: dois modais abertos ao mesmo tempo
   * teriam o mesmo id literal, e o botão de um enviaria o formulário do
   * outro. */
  const idFormulario = useId();
  const [subgrupoId, setSubgrupoId] = useState(subgrupos[0]?.subgrupo_id || "");
  const [numeroMascarado, setNumeroMascarado] = useState("");
  const [apelido, setApelido] = useState("");
  const [campos, setCampos] = useState<CamposOpcionaisProcesso>({});

  /** Trocar de subgrupo joga fora o que era do subgrupo anterior.
   *
   * 🔴 O responsável precisa ser ZERADO -- `ModalDeTarefa` já documenta esse
   * defeito com a razão: alguém do subgrupo antigo seguiria escolhido e o
   * salvamento falharia na validação do servidor, num campo que a pessoa nem
   * lembra de ter mexido.
   *
   * ⚠️ O cliente NÃO é zerado junto, e a diferença é o escopo: cliente é do
   * GRUPO (a validação dele não olha subgrupo), responsável é do SUBGRUPO.
   *
   * ⚠️ E o default não é reposto aqui. Quem cria vira responsável no
   * SERVIDOR, e só se for membro do subgrupo escolhido -- repor na tela
   * exigiria replicar essa régua aqui, e ela já é a resposta que
   * `GET /subgrupos/{id}/membros` dá. Lista vazia = o servidor decide. */
  function trocarSubgrupo(novo: string) {
    setSubgrupoId(novo);
    setCampos((atuais) => ({ ...atuais, responsaveis: [] }));
  }
  const toast = useToast();

  const numeroLimpo = apenasDigitos(numeroMascarado);

  const criarMutation = useMutation({
    mutationFn: () =>
      criarProcesso(subgrupoId, numeroLimpo, apelido.trim(), campos),
    onSuccess: () => {
      // Todas as outras criações do sistema confirmam; estas duas não
      // confirmavam nada, e quem cadastrasse estando na página 3 ou com
      // filtro via o modal fechar e a tela não mudar.
      toast.sucesso("Processo cadastrado.");
      onCadastrado();
      onFechar();
    },
    onError: (err) => {
      toastErroMutation(toast, err, "Não foi possível cadastrar.");
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    criarMutation.mutate();
  }

  if (carregandoSubgrupos) {
    return (
      <Modal titulo="Novo processo" onFechar={onFechar} descarte="semFormulario">
        {/* Só o esqueleto: ele já diz que algo está vindo, e a frase em
            cima era a mesma informação escrita duas vezes. */}
        <Stack gap="14px" py="10px">
          <Esqueleto linhas={3} altura="38px" />
        </Stack>
      </Modal>
    );
  }

  if (subgrupos.length === 0) {
    return (
      <Modal titulo="Novo processo" onFechar={onFechar} descarte="semFormulario">
        <Text py="34px" px="10px" textAlign="center" color="fg.subtle">
          Cria um subgrupo primeiro (aba Subgrupos) antes de cadastrar
          processos.
        </Text>
      </Modal>
    );
  }

  /** O `<form>` fica só em volta dos campos, e o botão de enviar mora no
   * rodapé -- que é irmão do corpo que rola, como no artifact. O atributo
   * `form` é o que liga os dois: sem ele, ou o rodapé rola junto (e some da
   * vista em formulário longo) ou o submit para de funcionar. */
  return (
    <Modal
      descarte="semFormulario"
      titulo="Novo processo"
      onFechar={onFechar}
      rodape={
        <RodapeDeAcoes>
          <BotaoDeCancelar />
          <Botao
            type="submit"
            form={idFormulario}
            disabled={
              criarMutation.isPending ||
              numeroLimpo.length !== 20 ||
              !subgrupoId
            }
          >
            {criarMutation.isPending ? "Cadastrando…" : "Cadastrar"}
          </Botao>
        </RodapeDeAcoes>
      }
    >
      <form id={idFormulario} onSubmit={handleSubmit}>
        <Campo
          rotulo="Número do processo"
          para="numero"
          obrigatorio
          dica="20 dígitos, no padrão CNJ."
        >
          <Input
            id="numero"
            value={numeroMascarado}
            onChange={(e) =>
              setNumeroMascarado(mascararNumeroProcesso(e.target.value))
            }
            placeholder="0000366-97.2020.8.13.0145"
            inputMode="numeric"
            autoFocus
          />
        </Campo>

        <Campo rotulo="Apelido" para="apelido">
          <Input
            id="apelido"
            value={apelido}
            onChange={(e) => setApelido(e.target.value)}
            maxLength={TAMANHO_MAXIMO_DO_APELIDO_DE_PROCESSO}
          />
        </Campo>

        <Campo rotulo="Subgrupo" para="subgrupo" obrigatorio>
          <Select
            id="subgrupo"
            opcoes={subgrupos.map((s) => ({
              value: s.subgrupo_id,
              label: s.nome,
            }))}
            valor={subgrupoId}
            onMudar={trocarSubgrupo}
          />
        </Campo>

        <CamposProcesso valores={campos} onMudar={setCampos} subgrupoId={subgrupoId} />
      </form>
    </Modal>
  );
}
