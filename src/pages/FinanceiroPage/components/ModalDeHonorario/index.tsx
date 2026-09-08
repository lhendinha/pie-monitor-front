import { Input, Text } from "@chakra-ui/react";
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
import { MAXIMO_DE_PARCELAS, NATUREZA_ENTRADA } from "../../../../constants";
import { useClientesBuscaveis } from "../../../../hooks/useClientesBuscaveis";
import { comOpcaoEscolhida } from "../../../../utils/opcoesEscolhidas";
import { useGuardaDeDescarte } from "../../../../hooks/useGuardaDeDescarte";
import { useCamposDoLancamento } from "../../hooks/useCamposDoLancamento";
import CamposDeClassificacao from "../CamposDeClassificacao";
import CamposDeContaEResponsavel from "../CamposDeContaEResponsavel";
import type { ModalDeHonorarioProps } from "./types";

/** O que o escritório vai receber por um trabalho -- e o único formulário
 * com PARCELAS.
 *
 * 🔴 **Parcelas, e não "repetir mensalmente".** A parcela acaba; o aluguel
 * não. `valor_centavos` é o valor DE CADA parcela, e é isso que elimina a
 * divisão -- e com ela o centavo de sobra que faria a soma não fechar.
 *
 * 🔴 **Cliente e vínculo são obrigatórios aqui**, ao contrário dos outros
 * formulários: honorário é o que entra na FATURA do cliente, e uma fatura
 * sem dono não existe. Escolher o processo já sugere o cliente e o
 * departamento -- e as duas sugestões continuam trocáveis.
 *
 * ➡️ `index.test.tsx`.
 */
export default function ModalDeHonorario({
  catalogo, salvando, erro, onSalvar, onFechar,
}: ModalDeHonorarioProps) {
  const campos = useCamposDoLancamento(NATUREZA_ENTRADA);
  const clientes = useClientesBuscaveis();
  const [parcelas, setParcelas] = useState("1");
  const continuar = useRef(false);

  const quantasParcelas = Number(parcelas);
  const parcelasInvalidas =
    !Number.isInteger(quantasParcelas) ||
    quantasParcelas < 1 ||
    quantasParcelas > MAXIMO_DE_PARCELAS;
  const semCliente = campos.clienteId === "";
  const semVinculo = !campos.vinculos.processo && !campos.vinculos.atendimento;

  const impedido =
    campos.semDescricao || campos.semValor || campos.semData || campos.semConta ||
    campos.semCategoria || campos.semDepartamento || campos.rateioNaoFecha ||
    semCliente || semVinculo || parcelasInvalidas;

  const { mudou } = useGuardaDeDescarte({ ...campos.paraODescarte, parcelas });

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
    onSalvar(campos.montarDados(), quantasParcelas, tomarContinuar());
  }

  return (
    <Modal
      descarte={{ mudou, caso: "criacao" }}
      titulo="Novo honorário"
      onFechar={onFechar}
      rodape={
        <RodapeDeFormulario salvando={salvando}>
          <Botao
            variante="ghost"
            type="submit"
            form="form-do-honorario"
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
          <Botao type="submit" form="form-do-honorario" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </Botao>
        </RodapeDeFormulario>
      }
    >
      <form id="form-do-honorario" onSubmit={handleSubmit}>
        <LinhaDeCampos>
          <Campo
            rotulo="Vencimento"
            para="hon-vencimento"
            obrigatorio
            erro={campos.tentou && campos.semData ? "Informe o vencimento." : undefined}
          >
            <SeletorData
              id="hon-vencimento"
              rotuladoPor="hon-vencimento-rotulo"
              valor={campos.data}
              onMudar={campos.setData}
            />
          </Campo>
          <Campo
            rotulo="Valor da parcela"
            para="hon-valor"
            obrigatorio
            /* ⚠️ "da parcela", e não "Valor": num honorário de 3× R$ 1.000 o
               número digitado é 1.000. Chamar de "Valor" faria quem digita
               3.000 criar três de três mil. */
            erro={campos.tentou && campos.semValor ? "Informe o valor." : undefined}
          >
            <CampoDeValor
              id="hon-valor"
              valor={campos.valorCentavos}
              onMudar={campos.setValorCentavos}
            />
          </Campo>
        </LinhaDeCampos>

        <Campo
          rotulo="Descrição"
          para="hon-descricao"
          obrigatorio
          erro={campos.tentou && campos.semDescricao ? "Informe a descrição." : undefined}
        >
          <Input
            id="hon-descricao"
            value={campos.descricao}
            onChange={(e) => campos.setDescricao(e.target.value)}
            placeholder="Ex.: honorários da contestação no processo da Construtora Alfa"
            autoFocus
          />
        </Campo>

        <Campo
          rotulo="Processo ou atendimento"
          para="hon-vinculo"
          obrigatorio
          dica="De onde vem o honorário. Sugere o cliente e o departamento."
          erro={campos.tentou && semVinculo ? "Escolha o processo ou o atendimento." : undefined}
        >
          <VinculoDeRegistro
            id="hon-vinculo"
            valor={campos.vinculos}
            onMudar={campos.escolherVinculo}
          />
        </Campo>

        <Campo
          rotulo="Cliente"
          para="hon-cliente"
          obrigatorio
          erro={campos.tentou && semCliente ? "Escolha o cliente." : undefined}
        >
          <Select
            id="hon-cliente"
            /* ⚠️ O sugerido pelo processo entra na lista mesmo sem ela ter sido
               buscada: senão o campo fica vazio com um cliente escolhido. */
            opcoes={comOpcaoEscolhida(clientes.opcoes, campos.clienteId, campos.clienteNome)}
            valor={campos.clienteId}
            onMudar={campos.setClienteId}
            onBuscar={clientes.buscar}
            carregando={clientes.carregando}
            erro={clientes.erro}
            onTentarDeNovo={clientes.tentarDeNovo}
            placeholder="Vem do processo; pode trocar"
          />
        </Campo>

        <CamposDeClassificacao
          catalogo={catalogo}
          natureza={NATUREZA_ENTRADA}
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

        <Campo
          rotulo="Parcelas"
          para="hon-parcelas"
          obrigatorio
          /* 🔴 A frase existe porque o número não diz o que ele FAZ: "3" cria
             três lançamentos, um por mês, cada um com o valor digitado acima
             -- e quem lê "3" pode entender "dividido em três". */
          dica={
            quantasParcelas > 1 && !parcelasInvalidas
              ? `${quantasParcelas} lançamentos, um por mês, cada um com o valor da parcela.`
              : "Um lançamento só."
          }
          erro={
            campos.tentou && parcelasInvalidas
              ? `Parcelas tem de ser de 1 a ${MAXIMO_DE_PARCELAS}.`
              : undefined
          }
        >
          <Input
            id="hon-parcelas"
            type="number"
            /* ⚠️ SEM `min`/`max` no elemento: a validação nativa BLOQUEIA o
               envio antes de o formulário rodar, e aí a nossa mensagem --
               que é a que combina com o resto da tela -- nunca aparece.
               Quem recusa 0 e 61 é `parcelasInvalidas`, logo acima. */
            inputMode="numeric"
            value={parcelas}
            onChange={(e) => setParcelas(e.target.value)}
          />
        </Campo>

        {erro && (
          <Text mt="14px" fontSize="12px" color="status.bad">
            {erro}
          </Text>
        )}
      </form>
    </Modal>
  );
}
