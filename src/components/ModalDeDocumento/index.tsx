import { Input, Stack, Textarea } from "@chakra-ui/react";
import { useId, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

/* Irmãos importados um a um, e não pelo índice de `components`: este
   componente É exportado por aquele índice, e importar dele criaria um ciclo
   -- mesmo padrão do `ModalDeTarefa`. */
import Botao from "../Botao";
import Campo from "../Campo";
import CampoDeArquivo from "../CampoDeArquivo";
import CampoDeClientes from "../CampoDeClientes";
import LinhaDeCampos from "../LinhaDeCampos";
import Modal from "../Modal";
import RodapeDeAcoes from "../RodapeDeAcoes";
import { Select } from "../Select";
import VinculoDeRegistro from "../VinculoDeRegistro";
import { useToast } from "../Toast";
import {
  criarDocumento,
  enviarArquivo,
  listarMembrosDoSubgrupo,
  prepararEnvio,
} from "../../services";
import { toastErroMutation } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import { useSubgruposBuscaveis } from "../../hooks/useOpcoesBuscaveis";
import {
  DOCUMENTO_ARQUIVO,
  DOCUMENTO_LINK,
  TAMANHO_MAXIMO_DA_DESCRICAO_DE_DOCUMENTO,
  TAMANHO_MAXIMO_DA_URL_DE_DOCUMENTO,
  TAMANHO_MAXIMO_DO_TITULO_DE_DOCUMENTO,
  TIPOS_DE_DOCUMENTO,
} from "../../constants";
import type { VinculosDeRegistro } from "../../types";
import type { RespostaDeMembros } from "../../types/respostas";

interface ModalDeDocumentoProps {
  /** Subgrupo em que o modal ABRE. Depois disso quem manda é o seletor.
   * Vazio quando o modal veio da tela geral, que não tem subgrupo em mãos. */
  subgrupoInicial?: string;
  /** Vínculos já preenchidos -- é o que faz "Adicionar documento" de dentro
   * de um processo nascer com aquele processo escolhido. */
  vinculosIniciais?: Partial<VinculosDeRegistro>;
  /** Clientes já escolhidos, com os nomes: a aba do cliente abre o modal
   * com ele dentro. Os nomes vêm junto porque a etiqueta mostra nome, e a
   * busca do campo não roda sozinha pra descobri-lo. */
  clientesIniciais?: { ids: string[]; nomes: Map<string, string> };
  onSalvo: () => void;
  onFechar: () => void;
}

/** Adicionar documento: arquivo enviado ou link.
 *
 * 🔴 **Só CRIA.** Editar e excluir vivem na tela do documento, como em
 * Processos e Clientes -- clicar na linha abre a tela, e é lá que se mexe.
 * Um modal que também edita traria duas telas para a mesma coisa, e é o
 * caminho que o sistema já não segue.
 *
 * 🔴 **O arquivo não passa pela API.** São três passos: pedir a permissão de
 * gravar, enviar direto ao armazenamento, e só então criar o registro. O teto
 * de payload de um Lambda é 6 MB, e um documento pode ter 20.
 *
 * ⚠️ **Nada é gravado antes de o arquivo chegar**, e isso apaga um estado
 * inteiro: sem "envio incompleto" na lista, sem botão de reenviar, sem rota
 * de confirmar. O envio acontece com o modal aberto -- falhou, o erro aparece
 * aqui e a pessoa tenta de novo com tudo ainda digitado.
 */
export default function ModalDeDocumento({
  subgrupoInicial,
  vinculosIniciais,
  clientesIniciais,
  onSalvo,
  onFechar,
}: ModalDeDocumentoProps) {
  const prefixo = useId();
  const toast = useToast();

  const [tipo, setTipo] = useState<string>(DOCUMENTO_ARQUIVO);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [subgrupoId, setSubgrupoId] = useState(subgrupoInicial ?? "");
  const [vinculos, setVinculos] = useState<VinculosDeRegistro>({
    processo: vinculosIniciais?.processo ?? null,
    atendimento: vinculosIniciais?.atendimento ?? null,
  });
  const [clientes, setClientes] = useState<string[]>(clientesIniciais?.ids ?? []);
  const [nomesDosClientes, setNomesDosClientes] = useState(
    () => new Map(clientesIniciais?.nomes ?? []),
  );
  const [responsavel, setResponsavel] = useState("");

  const subgrupos = useSubgruposBuscaveis(true);
  /* ⚠️ `primeiraPagina`, não `opcoes`: `opcoes` encolhe enquanto a pessoa
     digita NESTE mesmo campo, e o padrão passaria a ser o primeiro resultado
     da busca em curso. Mesmo cuidado de `NovoAtendimentoForm`. */
  const subgrupoEscolhido = subgrupoId || subgrupos.primeiraPagina[0]?.value || "";

  /* Quem pode ser responsável: os membros DO SUBGRUPO escolhido -- o mesmo
     recorte que `membros_service.garantir_membro_do_subgrupo` aplica no
     servidor. A lista do grupo inteiro deixaria escolher alguém de fora, e
     o salvamento falharia depois de tudo preenchido. */
  const membrosQuery = useQuery<RespostaDeMembros>({
    queryKey: qk.membrosDoSubgrupo(subgrupoEscolhido),
    queryFn: () => listarMembrosDoSubgrupo(subgrupoEscolhido) as Promise<RespostaDeMembros>,
    enabled: Boolean(subgrupoEscolhido),
  });
  const membros = membrosQuery.data?.membros ?? [];

  /** Trocar de subgrupo zera o responsável: alguém do subgrupo anterior
   * seguiria escolhido, e o salvamento falharia na validação de membro. */
  function trocarSubgrupo(novo: string) {
    setSubgrupoId(novo);
    setResponsavel("");
  }

  const ehArquivo = tipo === DOCUMENTO_ARQUIVO;

  const salvar = useMutation({
    mutationFn: async () => {
      const comuns = {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        processo_numero: vinculos.processo?.id ?? null,
        atendimento_id: vinculos.atendimento?.id ?? null,
        cliente_ids: clientes,
        responsavel_id: responsavel || null,
      };

      if (!ehArquivo) {
        return criarDocumento(subgrupoEscolhido, {
          tipo: DOCUMENTO_LINK,
          url: url.trim(),
          ...comuns,
        });
      }

      // Os três passos, em ordem. O registro é o ÚLTIMO: até o arquivo estar
      // no armazenamento, não existe documento nenhum pra ficar pela metade.
      const envio = await prepararEnvio(subgrupoEscolhido, arquivo!.type);
      await enviarArquivo(envio, arquivo!);
      return criarDocumento(subgrupoEscolhido, {
        tipo: DOCUMENTO_ARQUIVO,
        chave: envio.chave,
        nome_arquivo: arquivo!.name,
        ...comuns,
      });
    },
    onSuccess: () => {
      toast.sucesso("Documento adicionado.");
      onSalvo();
      onFechar();
    },
    /* 🔴 O modal NÃO fecha em falha, e o formulário não é limpo. Um envio de
       20 MB que falha no fim custaria tudo de novo -- inclusive a descrição
       digitada. */
    onError: (err) => toastErroMutation(toast, err, "Não foi possível adicionar o documento."),
  });

  const faltaAlgo =
    titulo.trim() === "" ||
    !subgrupoEscolhido ||
    (ehArquivo ? !arquivo : url.trim() === "");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!faltaAlgo && !salvar.isPending) salvar.mutate();
  }

  return (
    <Modal
      titulo="Adicionar documento"
      onFechar={onFechar}
      rodape={
        <RodapeDeAcoes>
          <Botao variante="ghost" type="button" onClick={onFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" form={`${prefixo}-form`} disabled={faltaAlgo || salvar.isPending}>
            {/* "Enviando…" e não "Salvando…" quando há arquivo: a espera é o
                upload, e ela é sensivelmente mais longa que a de um
                formulário comum. */}
            {salvar.isPending ? (ehArquivo ? "Enviando…" : "Salvando…") : "Salvar"}
          </Botao>
        </RodapeDeAcoes>
      }
    >
      <Stack as="form" id={`${prefixo}-form`} onSubmit={handleSubmit} gap="0">
        <LinhaDeCampos>
          <Campo rotulo="Tipo" para={`${prefixo}-tipo`} obrigatorio>
            <Select
              id={`${prefixo}-tipo`}
              opcoes={TIPOS_DE_DOCUMENTO.map((t) => ({ value: t.id, label: t.rotulo }))}
              valor={tipo}
              onMudar={setTipo}
            />
          </Campo>
          <Campo
            rotulo="Subgrupo"
            para={`${prefixo}-subgrupo`}
            obrigatorio
            /* Diz o que o campo DECIDE. Sem isto ele parece classificação, e
               é permissão: é o subgrupo que define quem vê o documento. */
            dica="Quem participa dele enxerga este documento."
          >
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
        </LinhaDeCampos>

        {ehArquivo ? (
          <Campo rotulo="Arquivo" para={`${prefixo}-arquivo`} obrigatorio>
            <CampoDeArquivo
              id={`${prefixo}-arquivo`}
              valor={arquivo}
              desabilitado={salvar.isPending}
              onMudar={(escolhido) => {
                setArquivo(escolhido);
                /* O nome do arquivo vira o título, se ainda não há um. É o
                   que a pessoa escreveria de qualquer jeito -- e continua
                   editável, aqui e depois. */
                if (escolhido && !titulo.trim()) setTitulo(escolhido.name);
              }}
            />
          </Campo>
        ) : (
          <Campo rotulo="Endereço" para={`${prefixo}-url`} obrigatorio>
            <Input
              id={`${prefixo}-url`}
              type="url"
              placeholder="https://"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              maxLength={TAMANHO_MAXIMO_DA_URL_DE_DOCUMENTO}
            />
          </Campo>
        )}

        <Campo
          rotulo="Título"
          para={`${prefixo}-titulo`}
          obrigatorio
          /* ⚠️ Explica a separação entre título e nome do arquivo ANTES de
             ela surpreender: quem renomeia o título esperando renomear o
             arquivo baixado só descobriria meses depois, ao baixar. */
          dica={
            ehArquivo
              ? "É como o documento aparece na lista. O arquivo continua baixando com o nome original."
              : undefined
          }
        >
          <Input
            id={`${prefixo}-titulo`}
            placeholder="Petição inicial, procuração, contrato…"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            maxLength={TAMANHO_MAXIMO_DO_TITULO_DE_DOCUMENTO}
          />
        </Campo>

        <Campo rotulo="Descrição" para={`${prefixo}-descricao`}>
          <Textarea
            id={`${prefixo}-descricao`}
            placeholder="O que é este documento, e por que ele está aqui"
            rows={2}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            maxLength={TAMANHO_MAXIMO_DA_DESCRICAO_DE_DOCUMENTO}
          />
        </Campo>

        <Campo
          rotulo="Processo ou atendimento vinculado"
          para={`${prefixo}-vinculo`}
          dica="Opcional. Dá pra vincular um processo, um atendimento, ou os dois."
        >
          <VinculoDeRegistro
            id={`${prefixo}-vinculo`}
            valor={vinculos}
            onMudar={setVinculos}
          />
        </Campo>

        <Campo rotulo="Clientes" para={`${prefixo}-clientes`}>
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

        <Campo rotulo="Responsável" para={`${prefixo}-responsavel`}>
          <Select
            id={`${prefixo}-responsavel`}
            opcoes={[
              { value: "", label: "Sem responsável" },
              ...membros.map((m) => ({ value: m.email, label: m.apelido || m.email })),
            ]}
            valor={responsavel}
            onMudar={setResponsavel}
            carregando={membrosQuery.isPending}
          />
        </Campo>
      </Stack>
    </Modal>
  );
}
