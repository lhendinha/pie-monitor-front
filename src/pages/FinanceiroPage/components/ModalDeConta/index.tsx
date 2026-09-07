import { Input, Text } from "@chakra-ui/react";
import { useState, type FormEvent } from "react";

import {
  Botao,
  Campo,
  LinhaDeCampos,
  Modal,
  RodapeDeFormulario,
  Select,
  SeletorData,
} from "../../../../components";
import { TIPO_CONTA_CORRENTE, TIPOS_DE_CONTA } from "../../../../constants";
import { useGuardaDeDescarte } from "../../../../hooks/useGuardaDeDescarte";
import { centavosDoTexto, formatarCentavos, hojeISO } from "../../../../utils";
import type { ModalDeContaProps } from "./types";

/** Cadastrar ou renomear uma conta.
 *
 * 🔴 **Na edição, nome e dados bancários.** Ficam de fora o TIPO (muda quais
 * campos são obrigatórios num item que já existe) e o INÍCIO e o SALDO
 * INICIAL, que são write-once porque o saldo atual é mantido a partir deles
 * -- reescrevê-los faria a reconciliação acusar uma diferença que nunca
 * existiu. A API responde 422 se qualquer um dos três vier, e a tela mostra
 * a mesma régua: eles não aparecem na edição.
 *
 * ⚠️ **Os dados bancários só existem para conta CORRENTE.** É o que o
 * artifact faz (`tipo === "outros"` esconde o bloco), e é o que faz sentido:
 * "Caixa do escritório" não tem agência.
 *
 * ⚠️ **O saldo inicial é o único campo de dinheiro da tela**, e vai em
 * CENTAVOS para a API. `centavosDoTexto` devolve `null` para o vazio, que é
 * diferente de zero -- e aqui zero é um saldo legítimo.
 *
 * ➡️ `pages/FinanceiroPage/index.test.tsx`.
 */
export default function ModalDeConta({
  conta,
  salvando,
  erro,
  onSalvar,
  onFechar,
}: ModalDeContaProps) {
  const editando = Boolean(conta);
  const [nome, setNome] = useState(conta?.nome ?? "");
  const [tipo, setTipo] = useState(conta?.tipo ?? TIPO_CONTA_CORRENTE);
  const [inicio, setInicio] = useState(conta?.inicio ?? hojeISO());
  const [saldo, setSaldo] = useState(
    conta ? formatarCentavos(conta.saldo_inicial_centavos) : "",
  );
  const [banco, setBanco] = useState(conta?.banco ?? "");
  const [agencia, setAgencia] = useState(conta?.agencia ?? "");
  const [numero, setNumero] = useState(conta?.numero ?? "");
  const [tentou, setTentou] = useState(false);

  const ehCorrente = tipo === TIPO_CONTA_CORRENTE;
  const centavos = centavosDoTexto(saldo);
  const semNome = nome.trim() === "";
  const semInicio = inicio.trim() === "";
  const saldoInvalido = centavos === null;
  const semDadosBancarios =
    ehCorrente &&
    (banco.trim() === "" || agencia.trim() === "" || numero.trim() === "");
  /** Na edição, início e saldo não existem no formulário -- então não podem
   * impedir nada. O resto da régua é a mesma. */
  const impedido = editando
    ? semNome || semDadosBancarios
    : semNome || semInicio || saldoInvalido || semDadosBancarios;

  const { mudou } = useGuardaDeDescarte({
    nome: nome.trim(),
    tipo,
    inicio,
    saldo: saldo.trim(),
    /* ⚠️ Os bancários só entram quando são CORRENTE: sem isso, trocar o tipo
       para "outros" e voltar deixaria o modal "alterado" com tudo igual. */
    banco: ehCorrente ? banco.trim() : "",
    agencia: ehCorrente ? agencia.trim() : "",
    numero: ehCorrente ? numero.trim() : "",
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTentou(true);
    if (impedido) return;
    onSalvar({
      nome: nome.trim(),
      tipo,
      inicio,
      saldo_inicial_centavos: centavos ?? 0,
      ...(ehCorrente
        ? {
            banco: banco.trim(),
            agencia: agencia.trim(),
            numero: numero.trim(),
          }
        : {}),
    });
  }

  return (
    <Modal
      descarte={{ mudou, caso: editando ? "edicao" : "criacao" }}
      titulo={editando ? "Editar conta" : "Nova conta"}
      onFechar={onFechar}
      rodape={
        <RodapeDeFormulario salvando={salvando}>
          <Botao type="submit" form="form-da-conta" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </Botao>
        </RodapeDeFormulario>
      }
    >
      <form id="form-da-conta" onSubmit={handleSubmit}>
        {/* Some na edição pelo mesmo motivo da categoria: campo cinza convida
            a tentar o que a API recusa. */}
        {!editando && (
          <Campo rotulo="Tipo" para="tipo-da-conta" obrigatorio>
            <Select
              id="tipo-da-conta"
              opcoes={TIPOS_DE_CONTA}
              valor={tipo}
              onMudar={(novo) => novo && setTipo(novo)}
            />
          </Campo>
        )}

        <Campo
          rotulo="Nome"
          para="nome-da-conta"
          obrigatorio
          erro={tentou && semNome ? "Informe o nome da conta." : undefined}
        >
          <Input
            id="nome-da-conta"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Como a conta aparece nos lançamentos"
          />
        </Campo>

        {!editando && (
          <LinhaDeCampos>
            <Campo
              rotulo="Início"
              para="inicio-da-conta"
              obrigatorio
              erro={
                tentou && semInicio ? "Informe a data de início." : undefined
              }
            >
              <SeletorData
                id="inicio-da-conta"
                rotuladoPor="inicio-da-conta-rotulo"
                valor={inicio}
                onMudar={setInicio}
              />
            </Campo>
            <Campo
              rotulo="Saldo inicial"
              para="saldo-da-conta"
              obrigatorio
              erro={
                tentou && saldoInvalido
                  ? "Informe o saldo em reais."
                  : undefined
              }
            >
              <Input
                id="saldo-da-conta"
                value={saldo}
                onChange={(e) => setSaldo(e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
              />
            </Campo>
          </LinhaDeCampos>
        )}

        {/* 🔴 Só para conta CORRENTE: "Caixa do escritório" não tem agência,
            e pedir três campos que não existem é o jeito de fazer alguém
            inventar dado. Na edição o tipo é o que está GRAVADO -- ele não
            se troca aqui. */}
        {ehCorrente && (
          <>
            <Campo
              rotulo="Banco"
              para="banco-da-conta"
              obrigatorio
              erro={
                tentou && banco.trim() === "" ? "Informe o banco." : undefined
              }
            >
              <Input
                id="banco-da-conta"
                value={banco}
                onChange={(e) => setBanco(e.target.value)}
                placeholder="Código ou nome do banco"
              />
            </Campo>
            <LinhaDeCampos>
              <Campo
                rotulo="Agência"
                para="agencia-da-conta"
                obrigatorio
                erro={
                  tentou && agencia.trim() === ""
                    ? "Informe a agência."
                    : undefined
                }
              >
                <Input
                  id="agencia-da-conta"
                  value={agencia}
                  onChange={(e) => setAgencia(e.target.value)}
                  placeholder="Nº da agência"
                />
              </Campo>
              <Campo
                rotulo="Conta (com dígito)"
                para="numero-da-conta"
                obrigatorio
                erro={
                  tentou && numero.trim() === ""
                    ? "Informe o número da conta."
                    : undefined
                }
              >
                <Input
                  id="numero-da-conta"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="Nº da conta"
                />
              </Campo>
            </LinhaDeCampos>
          </>
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
