import { useState } from "react";

import { NATUREZA_ENTRADA } from "../../../constants";
import { hojeISO } from "../../../utils";
import type { ParcelaParaEnviar, Vinculo, VinculosDeRegistro } from "../../../types";
import type { DadosDoLancamento } from "../../../types/requisicoes";

/** Os campos que honorário, entrada e saída têm em comum, e as duas regras
 * que a API cobra e a tela precisa respeitar antes de enviar.
 *
 * 🔴 **Cliente OU contraparte, nunca os dois e nunca nenhum.** É a régua de
 * `_validar_contraparte` no servidor, e a razão dela é que os dois
 * preenchidos dariam duas respostas para "de quem é isto" -- a tela mostraria
 * uma e a fatura agruparia pela outra. Aqui isso vira UM campo que troca de
 * forma conforme o tipo escolhido, e não dois campos disputando.
 *
 * 🔴 **O vínculo carrega o subgrupo.** Sem `subgrupo_id`, a API responde
 * "Vínculo sem subgrupo" -- e é o mesmo subgrupo que vira a sugestão de
 * departamento, como a Fase 5 pede ("sugerido pelo vínculo escolhido e
 * trocável").
 *
 * ⚠️ **`chave_de_criacao` nasce com o formulário e não muda.** É ela que faz
 * o duplo clique devolver os MESMOS ids em vez de criar de novo -- e num
 * lançamento que nasce efetivado, é o que impede o saldo de andar duas
 * vezes.
 *
 * ➡️ os testes dos quatro modais.
 */
export function useCamposDoLancamento(natureza: string) {
  const [descricao, setDescricao] = useState("");
  const [valorCentavos, setValorCentavos] = useState<number | null>(null);
  const [data, setData] = useState(hojeISO());
  const [efetivado, setEfetivado] = useState(false);
  const [contaId, setContaId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [centroId, setCentroId] = useState("");
  const [clienteId, setClienteId] = useState("");
  /** O nome do cliente SUGERIDO pelo processo -- ver `Vinculo.clienteNomes`. */
  const [clienteNome, setClienteNome] = useState("");
  const [contraparte, setContraparte] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [documento, setDocumento] = useState("");
  const [rateio, setRateio] = useState<ParcelaParaEnviar[]>([{ subgrupo_id: "" }]);
  const [vinculos, setVinculos] = useState<VinculosDeRegistro>({
    processo: null,
    atendimento: null,
  });
  const [tentou, setTentou] = useState(false);
  /* Uma por formulário aberto, e é o `useState` com função que garante isso:
     recalcular a cada render daria uma chave nova por tecla digitada, e a
     proteção contra o duplo clique deixaria de existir. */
  const [chaveDeCriacao] = useState(() => crypto.randomUUID());

  const escolhido: Vinculo | null = vinculos.processo ?? vinculos.atendimento;

  /** Escolher o vínculo SUGERE o departamento e o cliente -- e não os
   * impõe.
   *
   * ⚠️ Só preenche o que está VAZIO: sobrescrever a escolha de quem já
   * decidiu é o defeito clássico de campo "inteligente". E o cliente só vem
   * quando o processo tem UM: com dois, escolher por conta própria seria
   * chutar de quem se cobra. */
  function escolherVinculo(novos: VinculosDeRegistro) {
    setVinculos(novos);
    const item = novos.processo ?? novos.atendimento;
    if (!item) return;
    if (item.subgrupoId && rateio.length === 1 && !rateio[0].subgrupo_id) {
      setRateio([{ subgrupo_id: item.subgrupoId }]);
    }
    if (!clienteId && item.clienteIds?.length === 1) {
      setClienteId(item.clienteIds[0]);
      setClienteNome(item.clienteNomes?.[0] ?? "");
    }
  }

  /** O que falta para o formulário poder ir. Cada modal soma o que é dele
   * (parcelas, contas da transferência). */
  const semDescricao = descricao.trim() === "";
  const semValor = !valorCentavos || valorCentavos <= 0;
  const semData = data.trim() === "";
  const semConta = contaId === "";
  const semCategoria = categoriaId === "";
  const semDepartamento = rateio.some((p) => !p.subgrupo_id);
  /** 🔴 A soma do rateio TEM de bater com o valor -- é invariante do
   * servidor, e o 400 dele não diz em qual linha está o erro. Com uma
   * parcela só não há o que somar: o valor dela é o do lançamento. */
  const rateioNaoFecha =
    rateio.length > 1 &&
    rateio.reduce((t, p) => t + (p.valor_centavos ?? 0), 0) !== (valorCentavos ?? 0);

  /** Monta o corpo, já sem os campos vazios que a API não quer ver.
   *
   * ⚠️ A parcela ÚNICA vai sem `valor_centavos`: ver `ParcelaParaEnviar`. */
  function montarDados(): DadosDoLancamento {
    const umDepartamento = rateio.length === 1;
    return {
      descricao: descricao.trim(),
      valor_centavos: valorCentavos ?? 0,
      data_vencimento: data,
      conta_id: contaId,
      categoria_id: categoriaId,
      rateio: umDepartamento
        ? [{ subgrupo_id: rateio[0].subgrupo_id }]
        : rateio.map((p) => ({ ...p })),
      ...(centroId ? { centro_id: centroId } : {}),
      ...(clienteId ? { cliente_id: clienteId } : {}),
      ...(contraparte.trim() ? { contraparte: contraparte.trim() } : {}),
      ...(escolhido?.subgrupoId ? { subgrupo_id: escolhido.subgrupoId } : {}),
      ...(vinculos.processo ? { numero_processo: vinculos.processo.id } : {}),
      ...(vinculos.atendimento ? { atendimento_id: vinculos.atendimento.id } : {}),
      ...(responsavel ? { responsavel } : {}),
      ...(documento.trim() ? { documento_numero: documento.trim() } : {}),
      /* 🔴 Data de efetivação = a MESMA data do campo. "Recebida em
         15/09" quer dizer que entrou no dia 15, não hoje -- e a API recusa
         efetivação no futuro, o que é o guarda certo para quem escolher
         "Recebida" com data de amanhã. */
      ...(efetivado ? { data_efetivacao: data } : {}),
      chave_de_criacao: chaveDeCriacao,
    };
  }

  /** O que o guarda de descarte observa: tudo que a pessoa pode ter
   * digitado. Sem isto, fechar um formulário preenchido não perguntaria
   * nada. */
  const paraODescarte = {
    descricao: descricao.trim(),
    valorCentavos,
    /* A data nasce com HOJE, então ela só conta como mudança se sair dele. */
    data: data === hojeISO() ? "" : data,
    efetivado,
    contaId,
    categoriaId,
    centroId,
    clienteId,
    contraparte: contraparte.trim(),
    responsavel,
    documento: documento.trim(),
    rateio: JSON.stringify(rateio.filter((p) => p.subgrupo_id)),
    vinculo: escolhido?.id ?? "",
  };

  return {
    descricao, setDescricao,
    valorCentavos, setValorCentavos,
    data, setData,
    efetivado, setEfetivado,
    contaId, setContaId,
    categoriaId, setCategoriaId,
    centroId, setCentroId,
    clienteId, setClienteId, clienteNome,
    contraparte, setContraparte,
    responsavel, setResponsavel,
    documento, setDocumento,
    rateio, setRateio,
    vinculos, escolherVinculo,
    tentou, setTentou,
    eEntrada: natureza === NATUREZA_ENTRADA,
    semDescricao, semValor, semData, semConta, semCategoria,
    semDepartamento, rateioNaoFecha,
    montarDados,
    paraODescarte,
  };
}
