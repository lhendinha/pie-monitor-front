import { Input, Stack, Textarea } from "@chakra-ui/react";
import { useId, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";

import {
  Botao,
  Campo,
  Modal,
  RodapeDeAcoes,
  Select,
  useToast,
} from "../../../../components";
import { criarAtendimento } from "../../../../services";
import { toastErroMutation } from "../../../../services/queryClient";
import CampoDeClientes from "../CampoDeClientes";
import CampoDeProcesso from "../CampoDeProcesso";
import type { ProcessoEscolhido } from "../CampoDeProcesso";
import type { Subgrupo } from "../../../../types";

interface Props {
  subgrupos: Subgrupo[];
  /** Os subgrupos ainda estão vindo. O botão "Adicionar" aparece antes
   * deles, então dá pra abrir este modal com o seletor vazio -- e aí o
   * Salvar ficava travado sem dizer por quê. */
  carregandoSubgrupos?: boolean;
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
  carregandoSubgrupos,
  onSalvo,
  onFechar,
}: Props) {
  const prefixo = useId();
  const toast = useToast();

  const [clientes, setClientes] = useState<string[]>([]);
  const [nomesDosClientes, setNomesDosClientes] = useState(new Map<string, string>());
  const [assunto, setAssunto] = useState("");
  /* O último da lista, como no Kanban: a listagem vem na ordem de criação,
     então o último é o mais recente -- o que costuma estar em uso. */
  const [subgrupoId, setSubgrupoId] = useState("");
  const [processo, setProcesso] = useState<ProcessoEscolhido | null>(null);
  const [registro, setRegistro] = useState("");

  const subgrupoEscolhido = subgrupoId || subgrupos[subgrupos.length - 1]?.subgrupo_id || "";

  const salvar = useMutation({
    mutationFn: () =>
      criarAtendimento({
        subgrupo_id: subgrupoEscolhido,
        assunto: assunto.trim(),
        cliente_ids: clientes,
        primeiro_registro: registro.trim(),
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
      titulo="Adicionar atendimento"
      onFechar={onFechar}
      rodape={
        <RodapeDeAcoes>
          <Botao variante="ghost" type="button" onClick={onFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" form={`${prefixo}-form`} disabled={faltaAlgo || salvar.isPending}>
            {salvar.isPending ? "Salvando…" : "Salvar"}
          </Botao>
        </RodapeDeAcoes>
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
            opcoes={subgrupos.map((s) => ({ value: s.subgrupo_id, label: s.nome }))}
            valor={subgrupoEscolhido}
            onMudar={setSubgrupoId}
            carregando={carregandoSubgrupos}
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
