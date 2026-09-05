/** O estado, a leitura de membros e o envio em três passos do formulário
 * de documento -- o `ModalDeDocumento` fica só com o JSX.
 *
 * ➡️ Os testes de `ModalDeDocumento/index.test.tsx` cobrem os dois juntos.
 */
import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { useGuardaDeDescarte } from "../../hooks/useGuardaDeDescarte";
import { useToast } from "../../contexts/ToastContext";
import {
  criarDocumento,
  enviarArquivo,
  listarMembrosDoSubgrupo,
  prepararEnvio,
} from "../../services";
import { toastErroMutation } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import { useSubgruposBuscaveis } from "../../hooks/useSubgruposBuscaveis";
import { DOCUMENTO_ARQUIVO, DOCUMENTO_LINK } from "../../constants";
import type { VinculosDeRegistro } from "../../types";
import type { RespostaDeMembros } from "../../types/respostas";
import type { OpcoesDoFormularioDeDocumento } from "./types";

export function useFormularioDeDocumento({
  subgrupoInicial,
  vinculosIniciais,
  clientesIniciais,
  onSalvo,
  onFechar,
}: OpcoesDoFormularioDeDocumento) {
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

  /* A projeção é o corpo do envio. Duas notas:

     🔴 O `arquivo` entra como está e é comparado por IDENTIDADE. É o que se
     quer saber -- "tem arquivo ou não". Escolher o mesmo arquivo de novo gera
     instância nova, mas nos dois casos o veredito é o mesmo: saiu de `null`,
     logo a pessoa mexeu. E remover devolve `null`, logo volta a limpo.

     ⚠️ `nomesDosClientes` fica FORA: é um `Map` de rótulos para a tela, não
     intenção de quem preenche -- a intenção é a lista `clientes`. Além disso
     `Map` não cabe em `ValorDeFormulario`, e o tipo recusaria. */
  const { mudou, resemear } = useGuardaDeDescarte({
    tipo,
    titulo: titulo.trim(),
    descricao: descricao.trim(),
    arquivo,
    url: url.trim(),
    subgrupoId: subgrupoEscolhido,
    clientes,
    responsavel: responsavel || "",
    processoNumero: vinculos.processo?.id ?? null,
    atendimentoId: vinculos.atendimento?.id ?? null,
  },
  /* 🔴 Espera o subgrupo padrão antes de opinar. Há uma fresta de uma
     renderização entre a resposta chegar (`subgrupoEscolhido` deixa de ser
     `""`) e o efeito avisar o retrato -- e um Escape nela abriria a pergunta
     sem ninguém ter tocado em nada. Foi a suíte CHEIA que reprovou: com mais
     carga, o gesto do teste caía exatamente ali; isolado, passava.

     ⚠️ **Esta linha não tem guarda mecânica, e é honesto dizer.** Tirá-la não
     derruba teste nenhum hoje: acertar a fresta depende de o gesto do teste
     cair entre duas renderizações, e isso mudou quando o gate passou a viver
     em estado. O MECANISMO está guardado no teste do próprio hook
     (`aguarda`), que é determinístico; o que não consegui foi um teste de
     componente que force a janela. Quem mexer aqui: a janela existe, o teste
     não a pega. */
  { aguarda: ["subgrupoPadrao"] });

  /* Mesmo caso do `NovoAtendimentoForm`: o subgrupo padrão é do SISTEMA. */
  useEffect(() => {
    if (!subgrupoId && subgrupoEscolhido) {
      resemear("subgrupoPadrao", { subgrupoId: subgrupoEscolhido });
    }
  }, [subgrupoId, subgrupoEscolhido, resemear]);

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

  return {
    tipo,
    setTipo,
    titulo,
    setTitulo,
    descricao,
    setDescricao,
    arquivo,
    setArquivo,
    url,
    setUrl,
    subgrupoEscolhido,
    subgrupos,
    trocarSubgrupo,
    vinculos,
    setVinculos,
    clientes,
    setClientes,
    nomesDosClientes,
    setNomesDosClientes,
    responsavel,
    setResponsavel,
    membros,
    carregandoMembros: membrosQuery.isPending,
    ehArquivo,
    faltaAlgo,
    mudou,
    salvando: salvar.isPending,
    handleSubmit,
  };
}
