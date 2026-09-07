import { Input, Text } from "@chakra-ui/react";
import { useState, type FormEvent } from "react";

import {
  Botao,
  BotaoDeTexto,
  Campo,
  Modal,
  RodapeDeFormulario,
} from "../../../../components";
import { useGuardaDeDescarte } from "../../../../hooks/useGuardaDeDescarte";
import type { ModalDeCentroProps } from "./types";

/** Cadastrar ou renomear um centro de custo.
 *
 * 🔴 **Um modal para UM campo, e é deliberado.** A auditoria do plano tinha
 * decidido o contrário (achado 10: "três modais eram dois -- centro de custo
 * nasce inline"), e a decisão valia quando as três eram LISTAS. Com as três
 * viradas tabela, duas delas abrindo modal, o centro inline deixava a mesma
 * tela com dois gestos diferentes para a mesma coisa -- e é o tipo de
 * diferença que lê como inacabado. Uniformidade entre irmãs na mesma tela
 * vale mais que uma parada a menos numa delas.
 *
 * ⚠️ O mesmo modal CRIA e RENOMEIA, como nos outros dois: o `PATCH` do
 * catálogo aceita só o nome, então os dois formulários seriam idênticos.
 *
 * ➡️ `pages/FinanceiroPage/index.test.tsx`.
 */
export default function ModalDeCentro({
  centro,
  salvando,
  erro,
  onSalvar,
  onFechar,
}: ModalDeCentroProps) {
  const editando = Boolean(centro);
  const [nome, setNome] = useState(centro?.nome ?? "");
  const [tentou, setTentou] = useState(false);
  const semNome = nome.trim() === "";

  const { mudou } = useGuardaDeDescarte({ nome: nome.trim() });

  function salvar(outro: boolean) {
    setTentou(true);
    if (semNome) return;
    onSalvar(nome.trim(), outro);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    salvar(false);
  }

  return (
    <Modal
      descarte={{ mudou, caso: editando ? "edicao" : "criacao" }}
      titulo={editando ? "Renomear centro de custo" : "Novo centro de custo"}
      onFechar={onFechar}
      rodape={
        <RodapeDeFormulario salvando={salvando}>
          {!editando && (
            <BotaoDeTexto onClick={() => salvar(true)}>Salvar e adicionar outro</BotaoDeTexto>
          )}
          <Botao type="submit" form="form-do-centro" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </Botao>
        </RodapeDeFormulario>
      }
    >
      <form id="form-do-centro" onSubmit={handleSubmit}>
        <Campo
          rotulo="Nome"
          para="nome-do-centro"
          obrigatorio
          dica="Um centro de custo por área ou por equipe: é por ele que o fluxo de caixa se filtra."
          erro={tentou && semNome ? "Informe o nome do centro de custo." : undefined}
        >
          <Input
            id="nome-do-centro"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Tributário"
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
