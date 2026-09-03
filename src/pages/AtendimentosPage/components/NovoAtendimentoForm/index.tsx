import { Input, Stack, Textarea } from "@chakra-ui/react";
import { useEffect, useId, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";

import { Botao, Campo, CampoDeClientes, CampoDeResponsaveis, Modal, RodapeDeFormulario, Select } from "../../../../components";
import { useToast } from "../../../../contexts/ToastContext";
import { useGuardaDeDescarte } from "../../../../hooks/useGuardaDeDescarte";
import { criarAtendimento } from "../../../../services";
import { toastErroMutation } from "../../../../services/queryClient";
import CampoDeProcesso from "../CampoDeProcesso";
import type { ProcessoEscolhido } from "../../types";
import type { OpcoesBuscaveis } from "../../../../hooks/useOpcoesBuscaveis";

interface NovoAtendimentoFormProps {
  /** Primeira página + busca -- ver `useSubgruposBuscaveis`. */
  subgrupos: OpcoesBuscaveis;
  onSalvo: () => void;
  onFechar: () => void;
}

/** Criar atendimento.
 *
 * Quatro obrigatórios, como no artifact: clientes, assunto, subgrupo e o
 * primeiro registro. O primeiro registro é obrigatório de propósito --
 * atendimento sem nenhuma anotação é uma linha vazia numa lista, e o
 * servidor também o exige.
 */
export default function NovoAtendimentoForm({
  subgrupos,
  onSalvo,
  onFechar,
}: NovoAtendimentoFormProps) {
  const prefixo = useId();
  const toast = useToast();

  const [clientes, setClientes] = useState<string[]>([]);
  const [nomesDosClientes, setNomesDosClientes] = useState(new Map<string, string>());
  const [assunto, setAssunto] = useState("");
  /* 🔴 O PRIMEIRO da lista. Era o último, com o comentário "a listagem vem
     na ordem de criação, então o último é o mais recente -- o que costuma
     estar em uso": a listagem passou a vir em ordem ALFABÉTICA, então o
     último virou só o último do alfabeto. Sem sinal nenhum sobre qual a
     pessoa quer, o primeiro da lista não finge saber mais do que sabe -- e
     o campo é editável. */
  const [subgrupoId, setSubgrupoId] = useState("");
  const [responsaveis, setResponsaveis] = useState<string[]>([]);
  const [processo, setProcesso] = useState<ProcessoEscolhido | null>(null);
  const [registro, setRegistro] = useState("");

  /* ⚠️ `primeiraPagina`: `opcoes` encolhe enquanto a pessoa digita NESTE
     mesmo campo, e o padrão passaria a ser o primeiro resultado da busca. */
  const subgrupoEscolhido = subgrupoId || subgrupos.primeiraPagina[0]?.value || "";

  /** Trocar de subgrupo joga fora quem era do subgrupo anterior.
   *
   * 🔴 O mesmo defeito que `ModalDeTarefa` documenta: sem zerar, alguém do
   * subgrupo antigo seguiria escolhido e o salvamento falharia na validação
   * do servidor, num campo que a pessoa nem lembra de ter mexido.
   *
   * ⚠️ Os CLIENTES não são zerados junto, e a diferença é o escopo: cliente
   * é do GRUPO (a validação dele não olha subgrupo), responsável é do
   * SUBGRUPO. */
  function trocarSubgrupo(novo: string) {
    setSubgrupoId(novo);
    setResponsaveis([]);
  }

  /* A projeção é o corpo do envio, campo a campo -- com `trim` onde ele
     apara, e `processo?.numero` em vez do objeto (o tipo recusa aninhado). */
  const { mudou, resemear } = useGuardaDeDescarte({
    subgrupoId: subgrupoEscolhido,
    assunto: assunto.trim(),
    clientes,
    responsaveis,
    registro: registro.trim(),
    processoNumero: processo?.numero ?? null,
  },
  /* Mesma fresta do `ModalDeDocumento`: entre a chegada do subgrupo padrão e
     o aviso ao retrato há uma renderização. */
  { aguarda: ["subgrupoPadrao"] });

  /* 🔴 O subgrupo padrão é escolhido pelo SISTEMA, não pela pessoa.
   *
   * `subgrupoEscolhido` nasce `""` e vira o primeiro da lista quando a
   * consulta responde. Como a projeção usa o valor do ENVIO -- e tem de usar,
   * senão re-escolher no Select a opção que já aparecia marcada contaria como
   * mudança --, essa chegada sozinha deixaria o modal "alterado" sem ninguém
   * ter tocado em nada.
   *
   * ⚠️ Só quando `subgrupoId` ainda está vazio: se a pessoa já escolheu, o
   * valor é dela e tem de sujar. E `resemear` deduz por chave, então um
   * refetch não re-baseia o retrato no meio da edição. */
  useEffect(() => {
    if (!subgrupoId && subgrupoEscolhido) {
      resemear("subgrupoPadrao", { subgrupoId: subgrupoEscolhido });
    }
  }, [subgrupoId, subgrupoEscolhido, resemear]);

  const salvar = useMutation({
    mutationFn: () =>
      criarAtendimento({
        subgrupo_id: subgrupoEscolhido,
        assunto: assunto.trim(),
        cliente_ids: clientes,
        primeiro_registro: registro.trim(),
        /* Vazio é resolvido no SERVIDOR: vira quem está criando, SE for
           membro do subgrupo. Repor o default aqui exigiria replicar essa
           régua na tela -- e ela já é a resposta que
           `GET /subgrupos/{id}/membros` dá. */
        responsaveis,
        processo_numero: processo?.numero ?? null,
      }),
    onSuccess: () => {
      toast.sucesso("Atendimento cadastrado.");
      onSalvo();
    },
    onError: (err) => toastErroMutation(toast, err, "Não foi possível cadastrar o atendimento."),
  });

  const faltaAlgo =
    clientes.length === 0 ||
    assunto.trim() === "" ||
    !subgrupoEscolhido ||
    registro.trim() === "";

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!faltaAlgo && !salvar.isPending) salvar.mutate();
  }

  return (
    <Modal
      descarte={{ mudou, caso: "criacao" }}
      titulo="Adicionar atendimento"
      onFechar={onFechar}
      rodape={
        <RodapeDeFormulario salvando={salvar.isPending}>
          <Botao type="submit" form={`${prefixo}-form`} disabled={faltaAlgo || salvar.isPending}>
            {salvar.isPending ? "Salvando…" : "Salvar"}
          </Botao>
        </RodapeDeFormulario>
      }
    >
      <Stack as="form" id={`${prefixo}-form`} onSubmit={handleSubmit} gap="0">
        <Campo rotulo="Clientes" para={`${prefixo}-clientes`} obrigatorio>
          <CampoDeClientes
            id={`${prefixo}-clientes`}
            valor={clientes}
            nomes={nomesDosClientes}
            onMudar={(ids, nomes) => {
              setClientes(ids);
              setNomesDosClientes(nomes);
            }}
          />
        </Campo>

        <Campo rotulo="Assunto" para={`${prefixo}-assunto`} obrigatorio>
          <Input
            id={`${prefixo}-assunto`}
            placeholder="Digite um título para o seu atendimento"
            value={assunto}
            onChange={(e) => setAssunto(e.target.value)}
          />
        </Campo>

        <Campo rotulo="Subgrupo" para={`${prefixo}-subgrupo`} obrigatorio>
          <Select
            id={`${prefixo}-subgrupo`}
            opcoes={subgrupos.opcoes}
            valor={subgrupoEscolhido}
            onMudar={trocarSubgrupo}
            carregando={subgrupos.carregandoPrimeiraVez}
            onBuscar={subgrupos.buscar}
            erro={subgrupos.erro}
            onTentarDeNovo={subgrupos.tentarDeNovo}
          />
        </Campo>

        <Campo rotulo="Responsáveis" para={`${prefixo}-responsaveis`}>
          <CampoDeResponsaveis
            id={`${prefixo}-responsaveis`}
            subgrupoId={subgrupoEscolhido}
            valor={responsaveis}
            onMudar={setResponsaveis}
          />
        </Campo>

        <Campo rotulo="Processo vinculado" para={`${prefixo}-processo`}>
          <CampoDeProcesso id={`${prefixo}-processo`} valor={processo} onMudar={setProcesso} />
        </Campo>

        <Campo
          rotulo="1º registro do atendimento"
          para={`${prefixo}-registro`}
          obrigatorio
          /* Diz por que é obrigatório: sem isso o asterisco parece
             burocracia num campo que dá trabalho preencher. */
          dica="A linha do tempo começa aqui. Registro não se edita nem se apaga depois."
        >
          <Textarea
            id={`${prefixo}-registro`}
            placeholder="Insira as anotações referentes ao atendimento"
            rows={4}
            value={registro}
            onChange={(e) => setRegistro(e.target.value)}
          />
        </Campo>
      </Stack>
    </Modal>
  );
}
