import { Input, Text } from "@chakra-ui/react";
import { useState, type FormEvent } from "react";

import {
  Botao,
  BotaoDeTexto,
  Campo,
  Modal,
  RodapeDeFormulario,
  Select,
} from "../../../../components";
import { NATUREZA_ENTRADA, NATUREZA_SAIDA } from "../../../../constants";
import { useGuardaDeDescarte } from "../../../../hooks/useGuardaDeDescarte";
import SeletorDeCor from "../SeletorDeCor";
import type { ModalDeCategoriaProps } from "./types";

const NATUREZAS = [
  { value: NATUREZA_SAIDA, label: "Saída" },
  { value: NATUREZA_ENTRADA, label: "Entrada" },
];

/** Cadastrar ou renomear uma categoria.
 *
 * 🔴 **Na EDIÇÃO só o nome muda.** Natureza, cor e agrupador ficam de fora
 * porque trocá-los reescreveria lançamentos já gravados: uma categoria que
 * vira de saída para entrada muda o lado do caixa de tudo que já usou ela.
 * A API aceita só o nome no `PATCH`, e a tela mostra a mesma régua.
 *
 * ⚠️ **O agrupador é filtrado pela NATUREZA escolhida.** Uma despesa dentro
 * de um agrupador de entrada somaria no lado errado do fluxo, e a API recusa
 * -- oferecer na tela seria empurrar a pessoa para um 400. Trocar a natureza
 * limpa o agrupador pelo mesmo motivo.
 *
 * ⚠️ **Agrupadora não entra na lista de agrupadores dela mesma**, e nem uma
 * filha: o encaixe é de um nível só.
 *
 * ➡️ `pages/FinanceiroPage/index.test.tsx`.
 */
export default function ModalDeCategoria({
  categoria,
  categorias,
  cores,
  salvando,
  erro,
  onSalvar,
  onFechar,
}: ModalDeCategoriaProps) {
  const editando = Boolean(categoria);
  const [nome, setNome] = useState(categoria?.nome ?? "");
  const [natureza, setNatureza] = useState(categoria?.natureza ?? NATUREZA_SAIDA);
  const [cor, setCor] = useState(categoria?.cor ?? cores[0] ?? "");
  const [agrupadorId, setAgrupadorId] = useState(categoria?.agrupador_id ?? "");
  /** O erro do obrigatório só aparece depois de TENTAR -- acusar "informe o
   * nome" no primeiro caractere é ruído. */
  const [tentou, setTentou] = useState(false);

  const semNome = nome.trim() === "";

  /** Quem pode ser agrupador: mesma natureza, de primeiro nível, e nunca a
   * própria categoria em edição. */
  const agrupadores = categorias.filter(
    (c) =>
      c.natureza === natureza &&
      !c.agrupador_id &&
      c.ativa &&
      c.categoria_id !== categoria?.categoria_id,
  );

  const { mudou } = useGuardaDeDescarte({
    nome: nome.trim(),
    natureza,
    cor,
    agrupadorId,
  });

  function trocarNatureza(nova: string) {
    setNatureza(nova);
    /* 🔴 Limpa o agrupador: ele foi escolhido entre os da natureza ANTERIOR,
       e manter a escolha mandaria para a API um par que ela recusa. */
    setAgrupadorId("");
  }

  function salvar(outra: boolean) {
    setTentou(true);
    if (semNome) return;
    onSalvar(
      { nome: nome.trim(), natureza, cor, agrupador_id: agrupadorId },
      outra,
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    salvar(false);
  }

  return (
    <Modal
      descarte={{ mudou, caso: editando ? "edicao" : "criacao" }}
      titulo={editando ? "Renomear categoria" : "Nova categoria"}
      onFechar={onFechar}
      rodape={
        <RodapeDeFormulario salvando={salvando}>
          {/* ⚠️ "Salvar e adicionar outra" entra ANTES do "Salvar", e não no
              slot da esquerda -- aquele é do "Excluir" (achado 7 da auditoria
              do plano). Só na criação: renomear "e adicionar outra" não quer
              dizer nada. */}
          {!editando && (
            <BotaoDeTexto onClick={() => salvar(true)}>Salvar e adicionar outra</BotaoDeTexto>
          )}
          <Botao type="submit" form="form-da-categoria" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </Botao>
        </RodapeDeFormulario>
      }
    >
      <form id="form-da-categoria" onSubmit={handleSubmit}>
        <Campo
          rotulo="Nome"
          para="nome-da-categoria"
          obrigatorio
          erro={tentou && semNome ? "Informe o nome da categoria." : undefined}
        >
          <Input
            id="nome-da-categoria"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Energia elétrica"
          />
        </Campo>

        {/* 🔴 Some na edição, e não fica desabilitado: campo cinza convida a
            tentar. O que não se muda não se mostra como se pudesse. */}
        {!editando && (
          <>
            <Campo rotulo="Natureza" para="natureza-da-categoria" obrigatorio>
              <Select
                id="natureza-da-categoria"
                opcoes={NATUREZAS}
                valor={natureza}
                onMudar={(nova) => nova && trocarNatureza(nova)}
              />
            </Campo>

            <Campo rotulo="Cor" para="cor-da-categoria" obrigatorio>
              <SeletorDeCor
                id="cor-da-categoria"
                cores={cores}
                escolhida={cor}
                onEscolher={setCor}
              />
            </Campo>

            <Campo
              rotulo="Agrupador"
              para="agrupador-da-categoria"
              dica="Dentro de um agrupador, a categoria aparece recuada na lista e somada nele no fluxo de caixa."
            >
              <Select
                id="agrupador-da-categoria"
                opcoes={[
                  { value: "", label: "Sem agrupador" },
                  ...agrupadores.map((c) => ({ value: c.categoria_id, label: c.nome })),
                ]}
                valor={agrupadorId}
                onMudar={(novo) => setAgrupadorId(novo ?? "")}
              />
            </Campo>
          </>
        )}

        {/* ⚠️ O erro da API fica no CORPO, e o modal não fecha: é o 409 de
            nome repetido, e fechar levaria embora o que a pessoa digitou. */}
        {erro && (
          <Text mt="14px" fontSize="12px" color="status.bad">
            {erro}
          </Text>
        )}
      </form>
    </Modal>
  );
}
