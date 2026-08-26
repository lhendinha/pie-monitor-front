import { Box, Flex, Heading, Input, Stack, Textarea } from "@chakra-ui/react";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import {
  Botao,
  Campo,
  CampoDeClientes,
  Cartao,
  Etiqueta,
  IconeLixeira,
  LinhaDeCampos,
  Select,
  VinculoDeRegistro,
  useToast,
} from "../../../../components";
import {
  DOCUMENTO_ARQUIVO,
  TAMANHO_MAXIMO_DA_DESCRICAO_DE_DOCUMENTO,
  TAMANHO_MAXIMO_DA_URL_DE_DOCUMENTO,
  TAMANHO_MAXIMO_DO_TITULO_DE_DOCUMENTO,
  rotuloDoTipo,
} from "../../../../constants";
import { atualizarDocumento, listarMembrosDoSubgrupo } from "../../../../services";
import { toastErroMutation } from "../../../../services/queryClient";
import { qk } from "../../../../services/queryKeys";
import { mascararNumeroProcesso } from "../../../../utils";
import CartaoDoArquivo from "../CartaoDoArquivo";
import type { Documento, VinculosDeRegistro } from "../../../../types";
import type { RespostaDeMembros } from "../../../../types/respostas";

interface FormularioDocumentoProps {
  /** O documento JÁ CARREGADO. Este componente não conhece estado de
   * consulta -- ver o comentário do componente. */
  documento: Documento;
  onSalvo: () => void;
  onRemover: () => void;
}

/** Cabeçalho + formulário de edição do documento, no molde de
 * `FormularioCliente`: o título como cabeçalho, as ações à direita da mesma
 * linha, e os campos num cartão.
 *
 * 🔴 **Recebe o documento pronto, e é por isso que existe separado da
 * página.** Os campos nascem do `useState` inicializado com o que veio --
 * técnica que exige o dado presente no primeiro render. Na página, esse
 * render acontece com a consulta pendente: o estado nasceria vazio e nada o
 * preencheria depois, então a tela abriria em branco e salvar apagaria o
 * documento inteiro.
 *
 * A alternativa era um `useEffect` copiando a resposta pro estado -- que
 * funciona, mas dispara render em cascata a cada resposta e é justamente o
 * que o `react-hooks/set-state-in-effect` aponta. Montar só depois de o dado
 * chegar resolve os dois de uma vez, e é o que a tela irmã já fazia.
 *
 * ⚠️ Sem `key` na montagem: depois de salvar, a página revalida e o
 * documento muda de referência -- se o componente remontasse a cada
 * resposta, ele descartaria o que a pessoa já tivesse digitado por cima.
 */
export default function FormularioDocumento({
  documento,
  onSalvo,
  onRemover,
}: FormularioDocumentoProps) {
  const toast = useToast();
  const ehArquivo = documento.tipo === DOCUMENTO_ARQUIVO;

  const [titulo, setTitulo] = useState(documento.titulo ?? "");
  const [descricao, setDescricao] = useState(documento.descricao ?? "");
  const [url, setUrl] = useState(documento.url ?? "");
  const [responsavel, setResponsavel] = useState(documento.responsavel_id ?? "");
  const [clientes, setClientes] = useState<string[]>(documento.cliente_ids ?? []);
  /* Os nomes vêm resolvidos pelo servidor, NA MESMA ORDEM dos ids -- sem
     isto a etiqueta de cada cliente mostraria o id cru até alguém abrir a
     busca do campo. */
  const [nomesDosClientes, setNomesDosClientes] = useState(
    () =>
      new Map(
        (documento.cliente_ids ?? []).map(
          (id, i) => [id, documento.cliente_nomes?.[i] ?? id] as const,
        ),
      ),
  );
  const [vinculos, setVinculos] = useState<VinculosDeRegistro>(() => ({
    /* O rótulo inicial é o próprio número/id: buscar o nome bonito (apelido
       do processo, assunto do atendimento) exigiria uma consulta a mais só
       pra abrir a tela, e mostrar campo vazio num documento QUE TEM vínculo
       seria pior -- salvar por cima o apagaria em silêncio. Mesmo raciocínio
       do `ModalDeTarefa`. */
    processo: documento.processo_numero
      ? {
          tipo: "processo",
          id: documento.processo_numero,
          rotulo: mascararNumeroProcesso(documento.processo_numero),
        }
      : null,
    atendimento: documento.atendimento_id
      ? { tipo: "atendimento", id: documento.atendimento_id, rotulo: documento.atendimento_id }
      : null,
  }));

  /* Quem pode ser responsável: os membros DESTE subgrupo -- o mesmo recorte
     que o servidor aplica. O subgrupo de um documento não muda (faz parte da
     chave primária), então a lista não precisa acompanhar seletor nenhum. */
  const membrosQuery = useQuery<RespostaDeMembros>({
    queryKey: qk.membrosDoSubgrupo(documento.subgrupo_id),
    queryFn: () =>
      listarMembrosDoSubgrupo(documento.subgrupo_id) as Promise<RespostaDeMembros>,
    enabled: Boolean(documento.subgrupo_id),
  });
  const membros = membrosQuery.data?.membros ?? [];

  const salvar = useMutation({
    mutationFn: () =>
      atualizarDocumento(documento.subgrupo_id, documento.documento_id, {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        /* `url` só vai no tipo `link`. Mandá-la vazia num arquivo seria
           gravar um campo que não é dele. */
        ...(ehArquivo ? {} : { url: url.trim() }),
        /* `null` explícito, e não omitido: é assim que se DESFAZ um vínculo
           num PATCH parcial -- omitir significaria "não mexa". */
        processo_numero: vinculos.processo?.id ?? null,
        atendimento_id: vinculos.atendimento?.id ?? null,
        cliente_ids: clientes,
        responsavel_id: responsavel || null,
      }),
    onSuccess: () => {
      toast.sucesso("Documento atualizado.");
      onSalvo();
    },
    onError: (err) => toastErroMutation(toast, err, "Não foi possível salvar o documento."),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (titulo.trim() && !salvar.isPending) salvar.mutate();
  }

  return (
    <form onSubmit={handleSubmit}>
      <Flex align="flex-start" justify="space-between" gap="16px" mb="18px" wrap="wrap">
        <Box minW="0">
          <Heading as="h1" fontSize="23px" fontWeight="800" letterSpacing="-0.01em">
            {/* O TÍTULO GRAVADO, não o que está sendo digitado: o cabeçalho
                diz que documento é este, e trocá-lo a cada tecla faria a tela
                parecer já ter salvo o que ainda não salvou. */}
            {documento.titulo}
          </Heading>
          <Flex align="center" gap="8px" mt="8px" wrap="wrap">
            <Etiqueta cores={{ bg: "bg.canvas", color: "fg.muted" }}>
              {rotuloDoTipo(documento.tipo)}
            </Etiqueta>
          </Flex>
        </Box>

        <Flex gap="8px" flexShrink="0">
          {/* Sem trava de papel: o piso da rota é `user` + participar do
              subgrupo, e quem enxerga o documento pode excluí-lo. Mostrar um
              botão que a API vai negar seria pior que não mostrar -- mas
              aqui ela não nega. */}
          <Botao variante="perigoContorno" type="button" onClick={onRemover}>
            <IconeLixeira />
            Excluir
          </Botao>
          <Botao type="submit" disabled={salvar.isPending || !titulo.trim()}>
            {salvar.isPending ? "Salvando…" : "Salvar"}
          </Botao>
        </Flex>
      </Flex>

      <Stack gap="14px">
        <CartaoDoArquivo documento={documento} onSubstituido={onSalvo} />

        <Cartao>
          <Campo
            rotulo="Título"
            para="documento-titulo"
            obrigatorio
            /* ⚠️ Diz a separação ANTES de ela surpreender: quem renomeia o
               título esperando renomear o arquivo baixado só descobriria
               meses depois, ao baixar. */
            dica={
              ehArquivo
                ? "É como o documento aparece na lista. O arquivo continua baixando com o nome original."
                : undefined
            }
          >
            <Input
              id="documento-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={TAMANHO_MAXIMO_DO_TITULO_DE_DOCUMENTO}
            />
          </Campo>

          {!ehArquivo && (
            <Campo rotulo="Endereço" para="documento-url" obrigatorio>
              <Input
                id="documento-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                maxLength={TAMANHO_MAXIMO_DA_URL_DE_DOCUMENTO}
              />
            </Campo>
          )}

          <Campo rotulo="Descrição" para="documento-descricao">
            <Textarea
              id="documento-descricao"
              rows={2}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              maxLength={TAMANHO_MAXIMO_DA_DESCRICAO_DE_DOCUMENTO}
            />
          </Campo>

          <Campo
            rotulo="Processo ou atendimento vinculado"
            para="documento-vinculo"
            dica="Opcional. Dá pra vincular um processo, um atendimento, ou os dois."
          >
            <VinculoDeRegistro id="documento-vinculo" valor={vinculos} onMudar={setVinculos} />
          </Campo>

          <Campo rotulo="Clientes" para="documento-clientes">
            <CampoDeClientes
              id="documento-clientes"
              valor={clientes}
              nomes={nomesDosClientes}
              onMudar={(ids, nomes) => {
                setClientes(ids);
                setNomesDosClientes(nomes);
              }}
            />
          </Campo>

          <LinhaDeCampos>
            <Campo rotulo="Responsável" para="documento-responsavel">
              <Select
                id="documento-responsavel"
                opcoes={[
                  { value: "", label: "Sem responsável" },
                  ...membros.map((m) => ({ value: m.email, label: m.apelido || m.email })),
                  /* Quem JÁ é responsável entra mesmo tendo saído do
                     subgrupo. Sem isto, abrir o documento de alguém que saiu
                     mostraria "Sem responsável" e salvar apagaria a
                     atribuição em silêncio. */
                  ...(responsavel && !membros.some((m) => m.email === responsavel)
                    ? [{ value: responsavel, label: documento.responsavel_nome ?? responsavel }]
                    : []),
                ]}
                valor={responsavel}
                onMudar={setResponsavel}
                carregando={membrosQuery.isPending}
              />
            </Campo>
            {/* O par vazio da linha: `LinhaDeCampos` divide em duas colunas,
                e um campo sozinho ocuparia a largura toda -- o Responsável
                ficaria com um campo de texto de 700px pra um nome. */}
            <Box />
          </LinhaDeCampos>
        </Cartao>
      </Stack>
    </form>
  );
}
