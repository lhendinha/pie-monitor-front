import { Flex, Heading, Input } from "@chakra-ui/react";
import { useRef, useState, type FormEvent } from "react";
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
import { camposAlterados } from "../../../../utils/processos";
import { toastErroMutation } from "../../../../services/queryClient";
import { mascararNumeroProcesso } from "../../../../utils";
import CamposProcesso from "../../../ProcessosPage/components/CamposProcesso";
import type { Processo } from "../../../../types";
import type { CamposOpcionaisProcesso } from "../../../../types";
import { TAMANHO_MAXIMO_DO_APELIDO_DE_PROCESSO } from "../../../../constants";

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
  /** O estado do formulário nasce do processo GRAVADO -- e `responsaveis`
   * tem que estar aqui.
   *
   * 🔴 Ele faltava, e o efeito não era só cosmético: o campo abria vazio num
   * processo que TEM responsável (escondendo quem responde), e o salvamento
   * mandava `responsaveis: []`. Quem escolhesse alguém só para passar do
   * erro SUBSTITUÍA quem estava lá, sem aviso. */
  const [campos, setCampos] = useState<CamposOpcionaisProcesso>({
    clienteIds: processo.cliente_ids || [],
    responsaveis: processo.responsaveis || [],
    objetoAssunto: processo.objeto_assunto || "",
    proximaProvidencia: processo.proxima_providencia || "",
    dataVerificar: processo.data_verificar || "",
    prazoFinal: processo.prazo_final || "",
    observacoes: processo.observacoes || "",
    faseId: processo.fase_id || "",
    situacaoId: processo.situacao_id || "",
  });
  /** O retrato de como o processo estava ao abrir -- a régua do que mudou.
   * `useRef` e não `useState`: ele não é para renderizar, e não pode se
   * refazer quando o processo é rebuscado no meio da edição. */
  const originais = useRef<CamposOpcionaisProcesso>(campos).current;
  const toast = useToast();

  const salvarMutation = useMutation({
    mutationFn: () =>
      atualizarProcesso(
        processo.subgrupo_id,
        processo.numero_processo,
        apelido.trim(),
        /* ⚠️ Só o que MUDOU. Reenviar o resto devolveria por cima o que outra
           pessoa alterou enquanto esta tela estava aberta. */
        camposAlterados(originais, campos),
      ),
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
            maxLength={TAMANHO_MAXIMO_DO_APELIDO_DE_PROCESSO}
            placeholder="Um nome curto pra identificar o processo"
          />
        </Campo>
        <CamposProcesso
          valores={campos}
          onMudar={setCampos}
          /* Sem isto a etiqueta mostraria o id cru de quem já está no
             processo: a busca só traz a primeira página, e o cliente
             escolhido meses atrás quase nunca está nela. */
          nomesDosClientes={processo.cliente_nomes}
          /* Na edição o subgrupo vem do próprio processo -- não há seletor.
             É a mesma prop com origem diferente, e quem monta decide. */
          subgrupoId={processo.subgrupo_id}
          /* Mesma razão de `nomesDosClientes`: sem isto, quem já é
             responsável mas SAIU do subgrupo apareceria como e-mail cru --
             ele não está na lista de membros. */
          nomesDosResponsaveis={processo.responsaveis_nomes}
        />
      </Cartao>
    </form>
  );
}
