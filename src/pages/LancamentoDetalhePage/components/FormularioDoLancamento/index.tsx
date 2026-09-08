import { Input, Text } from "@chakra-ui/react";
import type { FormEvent } from "react";
import { useState } from "react";

import {
  Campo,
  CampoComCadeado,
  CampoDeValor,
  LinhaDeCampos,
} from "../../../../components";
import { NATUREZA_ENTRADA, SITUACAO_EFETIVADO, TIPO_TRANSFERENCIA } from "../../../../constants";
import CamposDeClassificacao from "../../../FinanceiroPage/components/CamposDeClassificacao";
import CamposDeContaEResponsavel from "../../../FinanceiroPage/components/CamposDeContaEResponsavel";
import { ROTULO_DA_SITUACAO } from "../../../FinanceiroPage/constants";
import { formatarData, mascararNumeroProcesso } from "../../../../utils";
import { camposAlteradosDoLancamento } from "../../camposAlterados";
import type { CamposEditaveisDoLancamento, FormularioDoLancamentoProps } from "./types";

/** O lançamento aberto para edição -- a tela do artefato, campo por campo.
 *
 * 🔴 **Quatro campos do artefato existem aqui só para LER, com cadeado**, e
 * a razão é a API, não a tela:
 *
 * - **Situação** não é campo, é ação: quem a muda é "Marcar como recebido" /
 *   "Desfazer baixa", no cabeçalho, porque a mudança MOVE O SALDO da conta.
 * - **Vencimento** não está no `PATCH`: ele alimenta duas chaves derivadas de
 *   ordenação (`vencimento_ordem` e `aberto_ordem`), e trocá-lo sem
 *   recalculá-las tiraria o lançamento do período em que ele aparece.
 * - **Cliente** e **Processo ou atendimento** também não: o cliente é por
 *   quem a fatura agrupa, e o vínculo carrega o subgrupo que dá a permissão.
 *
 * Deixá-los editáveis seria prometer o que falha ao salvar; escondê-los
 * deixaria a pessoa sem saber de quem é o dinheiro. O cadeado é a terceira
 * saída, e é a que o projeto já usa em três outros campos.
 *
 * ⚠️ **Manda só o que MUDOU** (`camposAlteradosDoLancamento`), como o
 * processo e o atendimento -- ver a história no `CONTEXT.md` do front.
 *
 * ➡️ `../../index.test.tsx`.
 */
export default function FormularioDoLancamento({
  lancamento: l, catalogo, nomeDoCliente, erro, onSalvar,
}: FormularioDoLancamentoProps) {
  const [campos, setCampos] = useState<CamposEditaveisDoLancamento>({
    descricao: l.descricao,
    valorCentavos: l.valor_centavos,
    contraparte: l.contraparte,
    documento: l.documento_numero,
    categoriaId: l.categoria_id,
    centroId: l.centro_id,
    contaId: l.conta_id,
    responsavel: l.responsavel,
    rateio: l.rateio.map((p) => ({ ...p })),
  });
  const [tentou, setTentou] = useState(false);

  function mudar(pedaco: Partial<CamposEditaveisDoLancamento>) {
    setCampos((atual) => ({ ...atual, ...pedaco }));
  }

  const eEntrada = l.natureza === NATUREZA_ENTRADA;
  const eTransferencia = l.tipo === TIPO_TRANSFERENCIA;
  const efetivado = l.situacao === SITUACAO_EFETIVADO;
  const doCliente = Boolean(l.cliente_id);

  const semDescricao = campos.descricao.trim() === "";
  /* 🔴 Cliente OU contraparte, e nunca nenhum dos dois: é `_validar_contraparte`
     no servidor. Com cliente o campo é de leitura e sempre tem valor; sem
     cliente, esvaziá-lo daria 400 "Informe o cliente ou o nome de quem
     pagou/recebeu". */
  const semContraparte = !l.cliente_id && campos.contraparte.trim() === "";
  const semValor = !campos.valorCentavos || campos.valorCentavos <= 0;
  const semCategoria = campos.categoriaId === "";
  const semConta = campos.contaId === "";
  /* 🔴 Lista VAZIA conta como sem departamento -- `[].some()` é `false`, e
     sem esta primeira metade um lançamento antigo (criado antes de o rateio
     existir) passava pelo campo obrigatório sem ninguém escolher nada. */
  const semDepartamento =
    campos.rateio.length === 0 || campos.rateio.some((p) => !p.subgrupo_id);
  const rateioNaoFecha =
    campos.rateio.length > 1 &&
    campos.rateio.reduce((t, p) => t + (p.valor_centavos ?? 0), 0) !==
      (campos.valorCentavos ?? 0);

  const impedido =
    semDescricao || semValor || semContraparte || semCategoria || semConta ||
    semDepartamento || rateioNaoFecha;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTentou(true);
    if (impedido) return;
    onSalvar(camposAlteradosDoLancamento(l, campos));
  }

  /** O vínculo, do jeito que a pessoa o reconhece. Vazio quando não há. */
  const vinculo = l.numero_processo
    ? mascararNumeroProcesso(l.numero_processo)
    : l.atendimento_id
      ? "Atendimento vinculado"
      : "";

  return (
    <form id="form-do-lancamento" onSubmit={handleSubmit}>
      <LinhaDeCampos>
        <Campo
          rotulo="Situação"
          para="det-situacao"
          dica={
            eTransferencia
              ? "Transferência já nasce efetivada."
              : efetivado
                ? "Use “Desfazer baixa” para reabrir."
                : eEntrada
                  ? "Use “Marcar como recebido” para dar baixa."
                  : "Use “Marcar como pago” para dar baixa."
          }
        >
          <CampoComCadeado>
            <Input
              id="det-situacao"
              value={ROTULO_DA_SITUACAO[l.situacao] ?? l.situacao}
              disabled
            />
          </CampoComCadeado>
        </Campo>
        <Campo
          rotulo={
            l.data_efetivacao
              ? eEntrada ? "Recebida em" : "Paga em"
              : eEntrada ? "A receber em" : "Vencimento"
          }
          para="det-vencimento"
          dica="O vencimento não se edita: exclua e refaça."
        >
          <CampoComCadeado>
            <Input
              id="det-vencimento"
              value={formatarData(l.data_efetivacao || l.data_vencimento)}
              disabled
            />
          </CampoComCadeado>
        </Campo>
      </LinhaDeCampos>

      <Campo
        rotulo="Descrição"
        para="det-descricao"
        obrigatorio
        erro={tentou && semDescricao ? "Informe a descrição." : undefined}
      >
        <Input
          id="det-descricao"
          value={campos.descricao}
          onChange={(e) => mudar({ descricao: e.target.value })}
        />
      </Campo>

      <LinhaDeCampos>
        <Campo
          rotulo="Valor"
          para="det-valor"
          obrigatorio
          erro={tentou && semValor ? "Informe o valor." : undefined}
        >
          <CampoDeValor
            id="det-valor"
            valor={campos.valorCentavos}
            onMudar={(valorCentavos) => mudar({ valorCentavos })}
          />
        </Campo>
        <Campo rotulo="Número do documento" para="det-documento">
          <Input
            id="det-documento"
            value={campos.documento}
            onChange={(e) => mudar({ documento: e.target.value })}
            placeholder="Nota fiscal ou comprovante"
          />
        </Campo>
      </LinhaDeCampos>

      <LinhaDeCampos>
        <Campo
          rotulo={eEntrada ? "Recebida de" : "Paga para"}
          para="det-contraparte"
          obrigatorio
          dica={doCliente ? "É um cliente do Argos; a fatura agrupa por ele." : undefined}
          erro={
            tentou && semContraparte
              ? "Informe de quem veio ou para quem foi."
              : undefined
          }
        >
          {/* 🔴 Cliente é LEITURA, contraparte é edição. Os dois ocupam o
              mesmo lugar porque a API aceita um OU outro -- nunca os dois --,
              e `cliente_id` não está no `PATCH`. */}
          {doCliente ? (
            <CampoComCadeado>
              <Input id="det-contraparte" value={nomeDoCliente || l.cliente_id} disabled />
            </CampoComCadeado>
          ) : (
            <Input
              id="det-contraparte"
              value={campos.contraparte}
              onChange={(e) => mudar({ contraparte: e.target.value })}
            />
          )}
        </Campo>
        <Campo
          rotulo="Processo ou atendimento"
          para="det-vinculo"
          dica={vinculo ? "O vínculo não se edita." : undefined}
        >
          <CampoComCadeado>
            <Input id="det-vinculo" value={vinculo || "Sem vínculo"} disabled />
          </CampoComCadeado>
        </Campo>
      </LinhaDeCampos>

      {/* ⚠️ A transferência não tem categoria, centro nem departamento: o
          dinheiro só muda de conta, e classificá-la a faria aparecer como
          receita de um lado e despesa do outro no fluxo de caixa. */}
      {!eTransferencia && (
        <CamposDeClassificacao
          catalogo={catalogo}
          natureza={l.natureza}
          categoriaId={campos.categoriaId}
          onCategoria={(categoriaId) => mudar({ categoriaId })}
          centroId={campos.centroId}
          onCentro={(centroId) => mudar({ centroId })}
          rateio={campos.rateio}
          onRateio={(rateio) => mudar({ rateio })}
          valorTotalCentavos={campos.valorCentavos}
          tentou={tentou}
          semCategoria={semCategoria}
          semDepartamento={semDepartamento}
          rateioNaoFecha={rateioNaoFecha}
        />
      )}

      <CamposDeContaEResponsavel
        catalogo={catalogo}
        contaId={campos.contaId}
        onConta={(contaId) => mudar({ contaId })}
        responsavel={campos.responsavel}
        onResponsavel={(responsavel) => mudar({ responsavel })}
        subgrupoId={campos.rateio[0]?.subgrupo_id ?? l.subgrupo_id}
        tentou={tentou}
        semConta={semConta}
      />

      {erro && (
        <Text mt="14px" fontSize="12px" color="status.bad">
          {erro}
        </Text>
      )}
    </form>
  );
}
