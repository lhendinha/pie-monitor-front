import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";

import {
  CampoDeLeitura,
  Esqueleto,
  Etiqueta,
  EtiquetaDeMetadado,
  Faixa,
  Ponto,
  TextoDaComunicacao,
} from "../../../../components";
import { detalhesProcesso } from "../../../../services";
import { qk } from "../../../../services/queryKeys";
import { CORES_DO_ENVIO } from "../../../../theme/envio";
import { formatarDataHora, mascararNumeroProcesso } from "../../../../utils";
import type { HistoricoItem } from "../../../../types";
import type {
  RespostaDeDetalhesDoProcesso,
} from "../../../../types/respostas";

interface DetalheHistoricoProps {
  item: HistoricoItem;
}

/** O detalhe de UM envio.
 *
 * Diferente da lista de movimentações de um processo: aqui é só a
 * comunicação que gerou esta notificação. Vem pela MESMA rota que o link do
 * e-mail já abre (`GET /processos/{numero}/detalhes`), filtrada pelo
 * `comunicacao_id` guardado no item -- sem rota nova e sem duplicar o texto
 * no backend. Mesma chave de consulta da página de detalhe do processo, pra
 * dividir o cache.
 */
export default function DetalheHistorico({ item }: DetalheHistoricoProps) {
  const ehDeTarefa = Boolean(item.tarefa_id);
  const ehLembrete = item.tipo_envio === "lembrete";
  const falhou = Boolean(item.falhou);

  /** Consulta sempre que houver processo pra consultar, e não só quando
   * houver `comunicacao_id`: o apelido vem daqui, e registro antigo (sem o
   * id da comunicação) também tem processo. O id decide só qual texto
   * mostrar. Lembrete de tarefa não tem processo nenhum -- `numero_processo`
   * lá guarda `TAREFA#{id}` porque é chave de partição. */
  const habilitado = !ehDeTarefa;

  const query = useQuery<RespostaDeDetalhesDoProcesso>({
    queryKey: qk.detalhesProcesso(item.numero_processo),
    queryFn: () => detalhesProcesso(item.numero_processo),
    enabled: habilitado,
  });

  const carregando = habilitado && query.isPending;
  const erroAoCarregar =
    habilitado && query.isError
      ? query.error instanceof Error
        ? query.error.message
        : "Não foi possível carregar."
      : null;
  const comunicacao =
    item.comunicacao_id != null
      ? (query.data?.comunicacoes.find(
          (c) => String(c.comunicacao_id) === String(item.comunicacao_id),
        ) ?? null)
      : null;
  // O detalhe devolve uma linha por subgrupo visível; o apelido é o mesmo em
  // todas, então a primeira serve.
  const apelido = query.data?.processos?.[0]?.apelido;

  return (
    <Stack gap="16px">
      <Flex align="center" gap="8px" wrap="wrap">
        <Etiqueta cores={falhou ? CORES_DO_ENVIO.falhou : CORES_DO_ENVIO.enviado}>
          {falhou ? "Falha no envio" : "Enviado"}
        </Etiqueta>
        <EtiquetaDeMetadado>{formatarDataHora(item.enviado_em)}</EtiquetaDeMetadado>
        {ehLembrete && <EtiquetaDeMetadado>Lembrete</EtiquetaDeMetadado>}
        {item.tipo_comunicacao && <EtiquetaDeMetadado>{item.tipo_comunicacao}</EtiquetaDeMetadado>}
        {item.nome_orgao && <EtiquetaDeMetadado>{item.nome_orgao}</EtiquetaDeMetadado>}
      </Flex>

      {/* O servidor guarda o motivo da falha justamente pra responder "não
          fui avisado" -- até agora isso só existia no log. */}
      {falhou && item.erro && (
        <Faixa tom="aviso" aEsquerda>
          {`Não foi entregue: ${item.erro}`}
        </Faixa>
      )}

      {item.assunto && (
        <CampoDeLeitura rotulo="Assunto">
          <Text fontSize="13.5px">{item.assunto}</Text>
        </CampoDeLeitura>
      )}

      {/* Lembrete de tarefa não tem processo: um campo "Processo" vazio é
          pior que campo nenhum. */}
      {!ehDeTarefa && (
        <CampoDeLeitura rotulo="Processo">
          {/* Os dois vão num bloco só: filhos diretos do campo herdariam o
              intervalo dele (6px) e o apelido descolaria do número que ele
              nomeia. */}
          <Box>
            <Text fontSize="13.5px" fontFamily="mono">
              {mascararNumeroProcesso(item.numero_processo)}
            </Text>
            {/* O apelido embaixo do número: 20 dígitos não dizem de que
                processo se trata, e o apelido é justamente o nome que
                alguém deu pra reconhecê-lo. */}
            {apelido && (
              <Text fontSize="11.5px" color="fg.subtle">
                {apelido}
              </Text>
            )}
          </Box>
        </CampoDeLeitura>
      )}

      {/* Um por linha, e não separados por vírgula como na listagem: aqui é
          onde se confere QUEM recebeu, e uma fila de endereços colada não se
          lê -- na linha da lista, que precisa caber em uma linha, a vírgula
          continua fazendo sentido. */}
      {item.destinatarios && item.destinatarios.length > 0 && (
        <CampoDeLeitura rotulo="Destinatários">
          <Stack gap="6px">
            {item.destinatarios.map((email) => (
              <Flex key={email} align="center" gap="9px">
                <Ponto />
                <Text fontSize="13.5px">{email}</Text>
              </Flex>
            ))}
          </Stack>
        </CampoDeLeitura>
      )}

      {/* Dois rótulos porque são duas coisas: no lembrete o texto foi
          escrito pelo sistema, na movimentação ele é o que o tribunal
          publicou. */}
      <CampoDeLeitura rotulo={ehLembrete ? "Mensagem enviada" : "Teor da publicação"}>
        {carregando && <Esqueleto linhas={2} />}
        {!carregando && erroAoCarregar && (
          <Text fontSize="13px" color="fg.subtle">
            {erroAoCarregar}
          </Text>
        )}
        {!carregando && !erroAoCarregar && (
          <TextoDaComunicacao
            inteiro
            html={comunicacao?.texto}
            textoPlano={comunicacao ? undefined : item.mensagem || "Texto não disponível."}
          />
        )}
      </CampoDeLeitura>
    </Stack>
  );
}

