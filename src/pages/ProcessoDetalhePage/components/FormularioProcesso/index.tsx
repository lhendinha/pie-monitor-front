import { Flex, Heading, Input } from "@chakra-ui/react";
import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";

import {
  Botao,
  Campo,
  Cartao,
  EtiquetaDeMetadado,
  IconeLixeira,
  useToast,
} from "../../../../components";
import { atualizarProcesso } from "../../../../services";
import { toastErroMutation } from "../../../../services/queryClient";
import { mascararNumeroProcesso } from "../../../../utils";
import CamposProcesso from "../../../ProcessosPage/components/CamposProcesso";
import type { Processo } from "../../../../types";
import type { CamposOpcionaisProcesso } from "../../../../types";

interface FormularioProcessoProps {
  processo: Processo;
  subgrupoNome: string;
  faseRotulo: string;
  situacaoRotulo: string;
  onSalvo: () => void;
  onRemover: () => void;
}

/** Cabeçalho + formulário de edição do processo, como no artifact: o número
 * em mono com as etiquetas embaixo, as ações no canto direito da MESMA
 * linha, e os campos num cartão logo abaixo.
 *
 * Excluir vive aqui, e não na linha da tabela: ação destrutiva a um clique
 * de distância numa lista é convite a acidente.
 */
export default function FormularioProcesso({
  processo,
  subgrupoNome,
  faseRotulo,
  situacaoRotulo,
  onSalvo,
  onRemover,
}: FormularioProcessoProps) {
  const [apelido, setApelido] = useState(processo.apelido || "");
  const [campos, setCampos] = useState<CamposOpcionaisProcesso>({
    clienteIds: processo.cliente_ids || [],
    objetoAssunto: processo.objeto_assunto || "",
    proximaProvidencia: processo.proxima_providencia || "",
    dataVerificar: processo.data_verificar || "",
    prazoFinal: processo.prazo_final || "",
    observacoes: processo.observacoes || "",
    faseId: processo.fase_id || "",
    situacaoId: processo.situacao_id || "",
  });
  const toast = useToast();

  const salvarMutation = useMutation({
    mutationFn: () =>
      atualizarProcesso(processo.subgrupo_id, processo.numero_processo, apelido.trim(), campos),
    onSuccess: onSalvo,
    onError: (err) => toastErroMutation(toast, err, "Não foi possível atualizar o processo."),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    salvarMutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit}>
      <Flex align="flex-start" justify="space-between" gap="16px" mb="18px">
        <div>
          <Heading as="h1" fontFamily="mono" fontSize="19px" fontWeight="800" letterSpacing="-0.01em">
            {mascararNumeroProcesso(processo.numero_processo)}
          </Heading>
          <Flex wrap="wrap" gap="8px" mt="8px">
            <EtiquetaDeMetadado>{subgrupoNome}</EtiquetaDeMetadado>
            {situacaoRotulo && <EtiquetaDeMetadado>{situacaoRotulo}</EtiquetaDeMetadado>}
            {faseRotulo && <EtiquetaDeMetadado>{faseRotulo}</EtiquetaDeMetadado>}
          </Flex>
        </div>
        <Flex gap="8px" flexShrink={0}>
          {/* Lixeira + rótulo, como no artifact: só o texto não distingue
              a ação destrutiva das outras à primeira vista. */}
          <Botao variante="perigoContorno" onClick={onRemover}>
            <IconeLixeira />
            Excluir
          </Botao>
          <Botao type="submit" disabled={salvarMutation.isPending}>
            {salvarMutation.isPending ? "Salvando…" : "Salvar"}
          </Botao>
        </Flex>
      </Flex>

      <Cartao>
        <Campo rotulo="Apelido" para="apelido-edicao">
          <Input
            id="apelido-edicao"
            value={apelido}
            onChange={(e) => setApelido(e.target.value)}
            maxLength={512}
            placeholder="Um nome curto pra identificar o processo"
          />
        </Campo>
        <CamposProcesso valores={campos} onMudar={setCampos} />
      </Cartao>
    </form>
  );
}
