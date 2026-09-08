import { Checkbox, Input, Text } from "@chakra-ui/react";
import type { FormEvent } from "react";
import { useRef, useState } from "react";

import {
  Botao,
  Campo,
  CampoDeValor,
  LinhaDeCampos,
  Modal,
  RodapeDeFormulario,
  Select,
  SeletorData,
  VinculoDeRegistro,
} from "../../../../components";
import {
  MESES_DA_RECORRENCIA,
  NATUREZA_ENTRADA,
  SITUACAO_ABERTO,
  SITUACAO_EFETIVADO,
} from "../../../../constants";
import { useClientesBuscaveis } from "../../../../hooks/useClientesBuscaveis";
import { comOpcaoEscolhida } from "../../../../utils/opcoesEscolhidas";
import { useGuardaDeDescarte } from "../../../../hooks/useGuardaDeDescarte";
import {
  FORMAS_DA_ENTRADA,
  FORMAS_DA_SAIDA,
  FORMA_AVULSA,
  FORMA_DE_CLIENTE,
  FORMA_HONORARIO,
} from "../../constants";
import { useCamposDoLancamento } from "../../hooks/useCamposDoLancamento";
import CamposDeClassificacao from "../CamposDeClassificacao";
import CamposDeContaEResponsavel from "../CamposDeContaEResponsavel";
import type { ModalDeEntradaOuSaidaProps } from "./types";

/** O dinheiro que entra e o que sai -- UM componente para os dois.
 *
 * 🔴 **Um componente, e não dois arquivos quase iguais.** Entrada e saída
 * têm os mesmos treze campos, na mesma ordem, com as mesmas regras; o que
 * muda são quatro palavras ("Recebida de" / "Paga para", "A receber em" /
 * "Vencimento", "Recebida" / "Paga") e quais categorias aparecem. Dois
 * arquivos divergiriam no primeiro ajuste -- e o dinheiro é justamente onde
 * duas telas discordando vira número errado.
 *
 * 🔴 **Cliente OU contraparte, escolhido pelo campo "Tipo".** A API recusa
 * os dois juntos ("não os dois") e recusa nenhum. O artefato mostrava
 * "Paga para" ao lado do bloco de cliente da despesa -- preencher os dois
 * daria 400. Aqui o Tipo decide qual dos dois o formulário mostra, e não
 * existe estado em que os dois estejam preenchidos.
 *
 * ⚠️ **"Recebida"/"Paga" grava a MESMA data do campo como efetivação.** Não
 * é "hoje": marcar "Recebida" numa linha de 15/09 quer dizer que o dinheiro
 * entrou no dia 15. Data no futuro a API recusa, e é o guarda certo -- o
 * saldo da conta é o de hoje.
 *
 * ➡️ `index.test.tsx`.
 */
export default function ModalDeEntradaOuSaida({
  natureza, catalogo, salvando, erro, onSalvar, onTrocarParaHonorario, onFechar,
}: ModalDeEntradaOuSaidaProps) {
  const campos = useCamposDoLancamento(natureza);
  const clientes = useClientesBuscaveis();
  const [forma, setForma] = useState(FORMA_AVULSA);
  const [repetir, setRepetir] = useState(false);
  const continuar = useRef(false);

  const eEntrada = natureza === NATUREZA_ENTRADA;
  const deCliente = forma === FORMA_DE_CLIENTE;
  const semCliente = deCliente && campos.clienteId === "";
  const semContraparte = !deCliente && campos.contraparte.trim() === "";

  const impedido =
    campos.semDescricao || campos.semValor || campos.semData || campos.semConta ||
    campos.semCategoria || campos.semDepartamento || campos.rateioNaoFecha ||
    semCliente || semContraparte;

  const { mudou } = useGuardaDeDescarte({ ...campos.paraODescarte, forma, repetir });

  /** Trocar de forma LIMPA o campo que some.
   *
   * 🔴 Sem isto, digitar "Equatorial" em "Paga para", trocar para despesa de
   * cliente e escolher o cliente mandaria os dois -- e o servidor recusaria
   * com uma mensagem sobre um campo que já não está na tela. */
  function trocarForma(nova: string) {
    if (nova === FORMA_HONORARIO) {
      onTrocarParaHonorario?.();
      return;
    }
    setForma(nova);
    if (nova === FORMA_DE_CLIENTE) campos.setContraparte("");
    else campos.setClienteId("");
  }

  /** Lê e ZERA a marca -- ela vale para um envio só. Sem zerar, um
   * "Salvar e adicionar outra" deixaria todo "Salvar" seguinte sem fechar. */
  function tomarContinuar() {
    const valor = continuar.current;
    continuar.current = false;
    return valor;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    campos.setTentou(true);
    if (impedido) return;
    onSalvar(campos.montarDados(), repetir, tomarContinuar());
  }

  const rotuloDaData = campos.efetivado
    ? eEntrada ? "Recebida em" : "Paga em"
    : eEntrada ? "A receber em" : "Vencimento";

  return (
    <Modal
      descarte={{ mudou, caso: "criacao" }}
      titulo={eEntrada ? "Nova entrada" : "Nova saída"}
      onFechar={onFechar}
      rodape={
        <RodapeDeFormulario salvando={salvando}>
          <Botao
            variante="ghost"
            type="submit"
            form="form-do-lancamento"
            disabled={salvando}
            /* 🔴 A marca ANTES do submit, e num ref: lançamento raramente vem
               sozinho, e sem isto quem cadastra dez despesas do mês reabre o
               menu dez vezes. O ref e não estado porque o `handleSubmit`
               roda no mesmo tique do clique -- um `setState` ainda não teria
               chegado lá. */
            onClick={() => { continuar.current = true; }}
          >
            Salvar e adicionar outra
          </Botao>
          <Botao type="submit" form="form-do-lancamento" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </Botao>
        </RodapeDeFormulario>
      }
    >
      <form id="form-do-lancamento" onSubmit={handleSubmit}>
        <LinhaDeCampos>
          <Campo rotulo="Situação" para="lc-situacao" obrigatorio>
            <Select
              id="lc-situacao"
              opcoes={[
                { value: SITUACAO_ABERTO, label: eEntrada ? "A receber" : "A pagar" },
                { value: SITUACAO_EFETIVADO, label: eEntrada ? "Recebida" : "Paga" },
              ]}
              valor={campos.efetivado ? SITUACAO_EFETIVADO : SITUACAO_ABERTO}
              onMudar={(v) => campos.setEfetivado(v === SITUACAO_EFETIVADO)}
            />
          </Campo>
          <Campo
            rotulo={rotuloDaData}
            para="lc-data"
            obrigatorio
            erro={campos.tentou && campos.semData ? "Informe a data." : undefined}
          >
            <SeletorData
              id="lc-data"
              rotuladoPor="lc-data-rotulo"
              valor={campos.data}
              onMudar={campos.setData}
            />
          </Campo>
        </LinhaDeCampos>

        <Campo
          rotulo="Tipo"
          para="lc-forma"
          obrigatorio
          dica={
            eEntrada
              ? "Honorário abre o formulário próprio, com processo, cliente e parcelas."
              : "Despesa de cliente entra na fatura dele, ao lado dos honorários."
          }
        >
          <Select
            id="lc-forma"
            opcoes={eEntrada ? FORMAS_DA_ENTRADA : FORMAS_DA_SAIDA}
            valor={forma}
            onMudar={trocarForma}
          />
        </Campo>

        {deCliente ? (
          <>
            <Campo
              rotulo="Cliente"
              para="lc-cliente"
              obrigatorio
              erro={campos.tentou && semCliente ? "Escolha o cliente." : undefined}
            >
              <Select
                id="lc-cliente"
                /* ⚠️ O sugerido pelo processo entra na lista mesmo sem ela ter sido
               buscada: senão o campo fica vazio com um cliente escolhido. */
            opcoes={comOpcaoEscolhida(clientes.opcoes, campos.clienteId, campos.clienteNome)}
                valor={campos.clienteId}
                onMudar={campos.setClienteId}
                onBuscar={clientes.buscar}
                carregando={clientes.carregando}
                erro={clientes.erro}
                onTentarDeNovo={clientes.tentarDeNovo}
                placeholder="Nome do cliente"
              />
            </Campo>
            <Campo
              rotulo="Processo ou atendimento"
              para="lc-vinculo"
              dica="Opcional. Sugere o departamento."
            >
              <VinculoDeRegistro
                id="lc-vinculo"
                valor={campos.vinculos}
                onMudar={campos.escolherVinculo}
              />
            </Campo>
          </>
        ) : (
          <Campo
            rotulo={eEntrada ? "Recebida de" : "Paga para"}
            para="lc-contraparte"
            obrigatorio
            erro={
              campos.tentou && semContraparte
                ? "Informe de quem veio ou para quem foi."
                : undefined
            }
          >
            <Input
              id="lc-contraparte"
              value={campos.contraparte}
              onChange={(e) => campos.setContraparte(e.target.value)}
              placeholder={eEntrada ? "Cliente, fornecedor ou parceiro" : "Fornecedor, parceiro, órgão"}
            />
          </Campo>
        )}

        <Campo
          rotulo="Descrição"
          para="lc-descricao"
          obrigatorio
          erro={campos.tentou && campos.semDescricao ? "Informe a descrição." : undefined}
        >
          <Input
            id="lc-descricao"
            value={campos.descricao}
            onChange={(e) => campos.setDescricao(e.target.value)}
            placeholder={eEntrada ? "O que é esta entrada" : "O que é esta saída"}
          />
        </Campo>

        <LinhaDeCampos>
          <Campo
            rotulo="Valor"
            para="lc-valor"
            obrigatorio
            erro={campos.tentou && campos.semValor ? "Informe o valor." : undefined}
          >
            <CampoDeValor
              id="lc-valor"
              valor={campos.valorCentavos}
              onMudar={campos.setValorCentavos}
            />
          </Campo>
          <Campo rotulo="Número do documento" para="lc-documento">
            <Input
              id="lc-documento"
              value={campos.documento}
              onChange={(e) => campos.setDocumento(e.target.value)}
              placeholder="Nota fiscal ou comprovante"
            />
          </Campo>
        </LinhaDeCampos>

        <CamposDeClassificacao
          catalogo={catalogo}
          natureza={natureza}
          categoriaId={campos.categoriaId}
          onCategoria={campos.setCategoriaId}
          centroId={campos.centroId}
          onCentro={campos.setCentroId}
          rateio={campos.rateio}
          onRateio={campos.setRateio}
          valorTotalCentavos={campos.valorCentavos}
          tentou={campos.tentou}
          semCategoria={campos.semCategoria}
          semDepartamento={campos.semDepartamento}
          rateioNaoFecha={campos.rateioNaoFecha}
        />

        <CamposDeContaEResponsavel
          catalogo={catalogo}
          contaId={campos.contaId}
          onConta={campos.setContaId}
          responsavel={campos.responsavel}
          onResponsavel={campos.setResponsavel}
          subgrupoId={campos.rateio[0]?.subgrupo_id ?? ""}
          tentou={campos.tentou}
          semConta={campos.semConta}
        />

        {/* ⚠️ Some quando a situação é "já recebida/paga": a API recusa uma
            série que nasce efetivada, e com razão -- doze aluguéis pagos de
            uma vez é sempre engano de quem preencheu, e cada um moveria o
            saldo. */}
        {!campos.efetivado && (
          <Checkbox.Root
            checked={repetir}
            onCheckedChange={(e) => setRepetir(Boolean(e.checked))}
          >
            <Checkbox.HiddenInput id="lc-repetir" />
            <Checkbox.Control />
            <Checkbox.Label fontSize="13.5px">
              Repetir mensalmente
              <Text as="span" color="fg.subtle" ml="4px">
                cria os {MESES_DA_RECORRENCIA} próximos, até você encerrar
              </Text>
            </Checkbox.Label>
          </Checkbox.Root>
        )}

        {erro && (
          <Text mt="14px" fontSize="12px" color="status.bad">
            {erro}
          </Text>
        )}
      </form>
    </Modal>
  );
}
