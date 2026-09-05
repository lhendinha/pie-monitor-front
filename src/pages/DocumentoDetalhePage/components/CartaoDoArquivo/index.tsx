import { Box, Flex, Text, chakra } from "@chakra-ui/react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { Botao, CampoDeArquivo, Cartao, IconeLink } from "../../../../components";
import { useToast } from "../../../../contexts/ToastContext";
import { DOCUMENTO_ARQUIVO, formatarTamanho } from "../../../../constants";
import {
  enviarArquivo,
  linkDeDownload,
  prepararEnvio,
  substituirArquivo,
} from "../../../../services";
import { toastErroMutation } from "../../../../services/queryClient";
import type { Documento } from "../../../../types";

interface CartaoDoArquivoProps {
  documento: Documento;
  /** Trocar o arquivo APAGA o antigo, então segue a mesma régua do excluir
   * -- ver `podeDestruirDocumento`. Quem decide é a página; aqui só se
   * obedece, pra a regra não ficar escrita em dois lugares. */
  podeSubstituir: boolean;
  onSubstituido: () => void;
}

/** O arquivo (ou o link) do documento: o que ele é, e como chegar nele.
 *
 * Separado do formulário de propósito. Os campos de cima descrevem o
 * documento e se salvam juntos num botão; isto aqui são AÇÕES sobre o
 * conteúdo, que acontecem na hora do clique. Misturados num cartão só, o
 * "Salvar" pareceria confirmar também a troca do arquivo -- que já
 * aconteceu.
 */
export default function CartaoDoArquivo({
  documento,
  podeSubstituir,
  onSubstituido,
}: CartaoDoArquivoProps) {
  const toast = useToast();
  const [trocando, setTrocando] = useState(false);
  /* 🔴 O escolhido fica guardado AQUI, e não só passa pela mutação.
     Sem isto o campo continuaria mostrando a área vazia durante o envio --
     a pessoa não veria qual arquivo escolheu, e numa falha teria que
     escolhê-lo de novo em vez de só tentar outra vez. */
  const [substituto, setSubstituto] = useState<File | null>(null);
  const ehArquivo = documento.tipo === DOCUMENTO_ARQUIVO;

  const baixar = useMutation({
    mutationFn: () => linkDeDownload(documento.subgrupo_id, documento.documento_id),
    onSuccess: ({ url }) => {
      /* 🔴 Navegação de topo, e não `fetch` do conteúdo.
       *
       * A URL já vem com `Content-Disposition: attachment`, então o navegador
       * baixa e a tela atual não sai do lugar. Buscar o conteúdo por XHR pra
       * forçar o nome faria o pedido passar pelo `connect-src` do CSP -- e
       * falharia em produção com um erro de CORS que não menciona CSP. */
      window.location.assign(url);
    },
    onError: (err) => toastErroMutation(toast, err, "Não foi possível gerar o link de download."),
  });

  const substituir = useMutation({
    mutationFn: async (arquivo: File) => {
      // Os mesmos três passos da criação. O objeto antigo só é apagado
      // depois que o registro aponta pro novo -- quem faz isso é o servidor.
      const envio = await prepararEnvio(documento.subgrupo_id, arquivo.type);
      await enviarArquivo(envio, arquivo);
      return substituirArquivo(
        documento.subgrupo_id,
        documento.documento_id,
        envio.chave,
        arquivo.name,
      );
    },
    onSuccess: () => {
      toast.sucesso("Arquivo substituído.");
      setTrocando(false);
      setSubstituto(null);
      onSubstituido();
    },
    onError: (err) => toastErroMutation(toast, err, "Não foi possível substituir o arquivo."),
  });

  if (!ehArquivo) {
    /* Link não tem arquivo pra baixar nem pra substituir -- o endereço se
       edita no formulário de cima, como qualquer outro campo. */
    return (
      <Cartao titulo="Endereço">
        {documento.url ? (
          <chakra.a
            href={documento.url}
            target="_blank"
            /* `noopener` porque o destino é digitado por quem cadastra o
               documento: sem ele, a página aberta ganha `window.opener` e
               pode redirecionar a aba do Argos. */
            rel="noopener noreferrer"
            display="flex"
            alignItems="center"
            gap="8px"
            fontSize="13px"
            fontWeight="700"
            color="fg.brand"
            textDecoration="underline"
            wordBreak="break-all"
          >
            <Box flexShrink="0" display="flex">
              <IconeLink tamanho={13} />
            </Box>
            {documento.url}
          </chakra.a>
        ) : (
          <Text fontSize="13px" color="fg.subtle">
            Sem endereço.
          </Text>
        )}
      </Cartao>
    );
  }

  return (
    <Cartao titulo="Arquivo">
      <Flex align="center" justify="space-between" gap="16px" wrap="wrap">
        <Box minW="0">
          {/* O nome com que ele BAIXA, que não é necessariamente o título --
              ver `types/documento.ts`. Mostrá-lo aqui é o que impede a surpresa
              de renomear o título e receber outro nome no download. */}
          <Text fontSize="13px" fontWeight="700" color="fg" wordBreak="break-all">
            {documento.nome_arquivo || "—"}
          </Text>
          <Text fontSize="11.5px" color="fg.subtle">
            {documento.tamanho_bytes ? formatarTamanho(documento.tamanho_bytes) : "Tamanho desconhecido"}
          </Text>
        </Box>

        <Flex gap="8px" flexShrink="0">
          {/* 🔴 BAIXAR continua pra todo mundo do subgrupo -- é leitura, e o
              documento está ali justamente pra ser lido. O que some é
              SUBSTITUIR, porque ele destrói o arquivo antigo e nem passa por
              diálogo de confirmação. */}
          {podeSubstituir && (
            <Botao
              variante="ghost"
              type="button"
              onClick={() => {
                setTrocando((aberto) => !aberto);
                setSubstituto(null);
              }}
              disabled={substituir.isPending}
            >
              {trocando ? "Cancelar troca" : "Substituir"}
            </Botao>
          )}
          <Botao type="button" onClick={() => baixar.mutate()} disabled={baixar.isPending}>
            {baixar.isPending ? "Preparando…" : "Baixar"}
          </Botao>
        </Flex>
      </Flex>

      {trocando && (
        <Box mt="14px">
          <CampoDeArquivo
            id={`arquivo-substituto-${documento.documento_id}`}
            valor={substituto}
            desabilitado={substituir.isPending}
            /* Substitui NO ATO da escolha, sem um "Confirmar" a mais: a
               ação já foi pedida pelo botão "Substituir", e o campo só
               aparece depois dele. Um segundo passo aqui seria confirmar
               duas vezes a mesma decisão. */
            onMudar={(arquivo) => {
              setSubstituto(arquivo);
              if (arquivo) substituir.mutate(arquivo);
            }}
          />
          {substituir.isPending && (
            <Text fontSize="11.5px" color="fg.subtle" mt="6px">
              Enviando…
            </Text>
          )}
          <Text fontSize="11.5px" color="fg.subtle" mt="6px">
            O arquivo atual é apagado quando o novo entra no lugar. Não dá pra desfazer.
          </Text>
        </Box>
      )}

    </Cartao>
  );
}
