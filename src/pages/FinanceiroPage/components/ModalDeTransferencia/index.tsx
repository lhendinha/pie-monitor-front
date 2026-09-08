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
} from "../../../../components";
import { useGuardaDeDescarte } from "../../../../hooks/useGuardaDeDescarte";
import { usePessoasBuscaveis } from "../../../../hooks/usePessoasBuscaveis";
import { getEmail } from "../../../../services";
import { hojeISO } from "../../../../utils";
import { podeListarPessoas } from "../../../../utils/permissoes";
import { opcoesDeConta } from "../../opcoesDoCatalogo";
import type { ModalDeTransferenciaProps } from "./types";

/** Dinheiro que só muda de conta.
 *
 * 🔴 **Ela NASCE efetivada, e por isso não tem "Situação".** As duas contas
 * se movem na mesma transação, no dia informado -- e é por isso que a data
 * não pode ser no futuro: o saldo é o de hoje, e somar dinheiro que ainda
 * não se moveu faria o extrato mentir. A API recusa; o campo abre em hoje.
 *
 * 🔴 **Sem categoria, sem cliente e sem departamento.** Transferência fica
 * fora do fluxo de caixa: nada entrou nem saiu do escritório, e classificá-la
 * por categoria a faria aparecer como receita de um lado e despesa do outro,
 * dobrando o movimento. Pelo mesmo motivo ela não tem rateio -- não há o que
 * atribuir a um departamento.
 *
 * ⚠️ **Errou? Exclua e refaça.** A API não deixa editar as contas nem
 * reabrir uma transferência: os dois mudariam o sentido de um dinheiro que
 * já andou.
 *
 * ⚠️ A lista de pessoas aqui vem do GRUPO, e não de um departamento -- não
 * há departamento nesta tela. `GET /grupos/membros` tem piso `manager`, então
 * quem não pode listar fica com o próprio nome, que é o padrão de qualquer
 * jeito.
 *
 * ➡️ `index.test.tsx`.
 */
export default function ModalDeTransferencia({
  catalogo, salvando, erro, onSalvar, onFechar,
}: ModalDeTransferenciaProps) {
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [data, setData] = useState(hojeISO());
  const [valorCentavos, setValorCentavos] = useState<number | null>(null);
  const [descricao, setDescricao] = useState("");
  const [documento, setDocumento] = useState("");
  const eu = getEmail() ?? "";
  const [responsavel, setResponsavel] = useState(eu);
  const [tentou, setTentou] = useState(false);
  const [chaveDeCriacao] = useState(() => crypto.randomUUID());
  const continuar = useRef(false);

  const pessoas = usePessoasBuscaveis();
  const podeEscolherPessoa = podeListarPessoas();

  const contas = opcoesDeConta(catalogo);
  const semOrigem = origem === "";
  const semDestino = destino === "";
  const mesmaConta = origem !== "" && origem === destino;
  const semValor = !valorCentavos || valorCentavos <= 0;
  const semDescricao = descricao.trim() === "";
  const dataNoFuturo = data > hojeISO();

  const impedido =
    semOrigem || semDestino || mesmaConta || semValor || semDescricao ||
    data.trim() === "" || dataNoFuturo;

  const { mudou } = useGuardaDeDescarte({
    origem, destino,
    data: data === hojeISO() ? "" : data,
    valorCentavos,
    descricao: descricao.trim(),
    documento: documento.trim(),
    responsavel: responsavel === eu ? "" : responsavel,
  });

  /** Lê e ZERA a marca -- ela vale para um envio só. Sem zerar, um
   * "Salvar e adicionar outra" deixaria todo "Salvar" seguinte sem fechar. */
  function tomarContinuar() {
    const valor = continuar.current;
    continuar.current = false;
    return valor;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTentou(true);
    if (impedido) return;
    onSalvar({
      descricao: descricao.trim(),
      valor_centavos: valorCentavos ?? 0,
      data_vencimento: data,
      conta_origem_id: origem,
      conta_destino_id: destino,
      ...(responsavel ? { responsavel } : {}),
      ...(documento.trim() ? { documento_numero: documento.trim() } : {}),
      chave_de_criacao: chaveDeCriacao,
    }, tomarContinuar());
  }

  return (
    <Modal
      descarte={{ mudou, caso: "criacao" }}
      titulo="Nova transferência"
      onFechar={onFechar}
      rodape={
        <RodapeDeFormulario salvando={salvando}>
          <Botao
            variante="ghost"
            type="submit"
            form="form-da-transferencia"
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
          <Botao type="submit" form="form-da-transferencia" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </Botao>
        </RodapeDeFormulario>
      }
    >
      <form id="form-da-transferencia" onSubmit={handleSubmit}>
        <LinhaDeCampos>
          <Campo
            rotulo="Conta de origem"
            para="tr-origem"
            obrigatorio
            erro={tentou && semOrigem ? "Escolha a conta de origem." : undefined}
          >
            <Select
              id="tr-origem"
              opcoes={contas}
              valor={origem}
              onMudar={setOrigem}
              placeholder="Selecione"
            />
          </Campo>
          <Campo
            rotulo="Conta de destino"
            para="tr-destino"
            obrigatorio
            erro={
              tentou && semDestino
                ? "Escolha a conta de destino."
                : /* 🔴 A tela diz antes de o servidor dizer: transferir de
                     uma conta para ela mesma é engano de clique, e voltar do
                     servidor com isso custa um ida-e-volta e o formulário
                     inteiro em suspense. */
                  mesmaConta
                  ? "A conta de destino tem de ser diferente da de origem."
                  : undefined
            }
          >
            <Select
              id="tr-destino"
              opcoes={contas}
              valor={destino}
              onMudar={setDestino}
              placeholder="Selecione"
            />
          </Campo>
        </LinhaDeCampos>

        <LinhaDeCampos>
          <Campo
            rotulo="Data"
            para="tr-data"
            obrigatorio
            erro={
              tentou && dataNoFuturo
                ? "A transferência já aconteceu: a data não pode ser no futuro."
                : undefined
            }
          >
            <SeletorData
              id="tr-data"
              rotuladoPor="tr-data-rotulo"
              valor={data}
              onMudar={setData}
            />
          </Campo>
          <Campo
            rotulo="Valor"
            para="tr-valor"
            obrigatorio
            erro={tentou && semValor ? "Informe o valor." : undefined}
          >
            <CampoDeValor id="tr-valor" valor={valorCentavos} onMudar={setValorCentavos} />
          </Campo>
        </LinhaDeCampos>

        <Campo rotulo="Número do documento" para="tr-documento">
          <Input
            id="tr-documento"
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
            placeholder="Comprovante"
          />
        </Campo>

        <Campo
          rotulo="Descrição"
          para="tr-descricao"
          obrigatorio
          erro={tentou && semDescricao ? "Informe a descrição." : undefined}
        >
          <Input
            id="tr-descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex.: reforço do caixa para custas da semana"
          />
        </Campo>

        <Campo rotulo="Responsável" para="tr-responsavel">
          <Select
            id="tr-responsavel"
            opcoes={
              podeEscolherPessoa && pessoas.opcoes.length > 0
                ? pessoas.opcoes
                : [{ value: eu, label: eu }]
            }
            valor={responsavel}
            onMudar={setResponsavel}
            {...(podeEscolherPessoa
              ? {
                  onBuscar: pessoas.buscar,
                  carregando: pessoas.carregando,
                  erro: pessoas.erro,
                  onTentarDeNovo: pessoas.tentarDeNovo,
                }
              : {})}
          />
        </Campo>

        <Text fontSize="12px" color="fg.subtle">
          Transferência não entra no fluxo de caixa: o dinheiro só muda de conta.
        </Text>

        {erro && (
          <Text mt="14px" fontSize="12px" color="status.bad">
            {erro}
          </Text>
        )}
      </form>
    </Modal>
  );
}
