import { Box, Input } from "@chakra-ui/react";
import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Botao, Campo, Esqueleto, EstadoDeErro, LinhaDeCampos, RodapeDeAcoes, Select } from "../../../../components";
import { useToast } from "../../../../contexts/ToastContext";
import { atualizarMeuPerfil, lerMeuPerfil } from "../../../../services";
import { toastErroMutation } from "../../../../services/queryClient";
import { qk } from "../../../../services/queryKeys";
import { UFS } from "../../../../constants";
import { erroDaInscricao } from "../../../../utils/oab";
import type { CamposDoMeuPerfil, MeuPerfil } from "../../../../types";
import InterruptorDaImportacao from "../InterruptorDaImportacao";

/** Aba "Inscrição na OAB": a própria inscrição da pessoa.
 *
 * 🔴 **Esta aba CONSULTA `GET /me`, e a de dados não.** A inscrição não está
 * na sessão -- o login não a devolve -- e não deveria estar: seria uma cópia
 * que envelhece. Sem a consulta, a tela mostraria os campos vazios para quem
 * já cadastrou, e a pessoa cadastraria de novo. É o defeito que o `GET /me`
 * existe para evitar.
 *
 * ⚠️ Salva a inscrição **e o interruptor de importação**, e nada além: a aba
 * não conhece o campo do nome, então não há como mandá-lo por engano num
 * PATCH que o servidor trataria como "sobrescreve".
 *
 * ⚠️ **Os dois num "Salvar" só**, e não em dois botões: cadastrar a OAB e
 * ligar a importação é UMA intenção ("quero que o sistema traga meus
 * processos"), e o servidor aceita as duas coisas no mesmo PATCH. Separar
 * obrigaria a salvar duas vezes para um pedido só.
 */
export default function FormularioDaInscricao() {
  const [numeroOab, setNumeroOab] = useState("");
  const [ufOab, setUfOab] = useState("");
  const [ligada, setLigada] = useState(false);
  const [destino, setDestino] = useState("");
  const toast = useToast();
  const queryClient = useQueryClient();

  const query = useQuery<MeuPerfil>({
    queryKey: qk.meuPerfil(),
    queryFn: () => lerMeuPerfil(),
  });

  /* Os campos nascem do que está salvo -- mesmo arranjo de
     `ConfiguracoesDoGrupo`. Sem isto abririam vazios, e um "Salvar" sem
     querer apagaria a inscrição de quem já tem. */
  useEffect(() => {
    if (query.data) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- semeadura do formulário a partir do que está salvo; o projeto usa `useEffect` pra isso de propósito, ver o eslint.config.js
      setNumeroOab(query.data.numero_oab ?? "");
      setUfOab(query.data.uf_oab ?? "");
      setLigada(query.data.importacao_automatica);
      /* ⚠️ O contrato é lista, a tela escolhe um -- ver
         `InterruptorDaImportacao`. Com um subgrupo só, o destino é ele, e
         não há seletor para preenchê-lo. */
      setDestino(
        query.data.subgrupos_destino[0] ??
          (query.data.subgrupos.length === 1 ? query.data.subgrupos[0].id : ""),
      );
    }
  }, [query.data]);

  const salvar = useMutation({
    mutationFn: (campos: CamposDoMeuPerfil) => atualizarMeuPerfil(campos),
    onSuccess: () => {
      /* A inscrição volta do servidor normalizada; reler é o que impede a
         tela de afirmar o que ela mandou em vez do que ficou gravado. */
      queryClient.invalidateQueries({ queryKey: qk.meuPerfil() });
      toast.sucesso("Inscrição atualizada.");
    },
    onError: (err) => toastErroMutation(toast, err, "Não foi possível salvar."),
  });

  if (query.isPending) return <Esqueleto linhas={3} />;
  if (query.isError) {
    return (
      <EstadoDeErro
        mensagem="Não foi possível carregar a sua inscrição."
        onTentarDeNovo={() => query.refetch()}
        tentando={query.isFetching}
      />
    );
  }

  const perfil = query.data!;
  const numeroLimpo = numeroOab.trim();

  /* ⚠️ `obrigatoria: false`: as duas vazias é o estado VÁLIDO que significa
     "não tenho OAB" -- e é o único jeito de apagar uma cadastrada por engano.
     A busca por OAB usa a mesma régua com `true`, porque lá não há o que
     buscar sem inscrição. */
  const erro = erroDaInscricao(numeroOab, ufOab, { obrigatoria: false });

  /* A inscrição que VALERÁ depois de salvar -- a digitada, não a gravada.
     É ela que libera o interruptor: cadastrar e ligar no mesmo "Salvar" é um
     caminho que o servidor aceita. */
  const temInscricao = Boolean(numeroLimpo && ufOab && !erro);

  /* Com um subgrupo só não há seletor, então o destino é ele -- e sem isto
     "ligar" iria ao servidor sem destino e voltaria recusado. */
  const destinoEfetivo =
    perfil.subgrupos.length === 1 ? perfil.subgrupos[0].id : destino;

  const destinoSalvo = perfil.subgrupos_destino[0] ?? "";
  const mudou =
    numeroLimpo !== (perfil.numero_oab ?? "") ||
    ufOab !== (perfil.uf_oab ?? "") ||
    ligada !== perfil.importacao_automatica ||
    (ligada && destinoEfetivo !== destinoSalvo);

  /* ⚠️ Ligado sem destino é o único estado do formulário que o servidor
     recusa e a tela consegue prever. Barrar aqui evita um 400 que a pessoa
     leria como falha do sistema. */
  const faltaDestino = ligada && !destinoEfetivo;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (erro || faltaDestino || !mudou) return;
    salvar.mutate({
      inscricao: { numero: numeroLimpo, uf: ufOab },
      /* 🔴 Os dois campos SEMPRE juntos: o servidor zera o destino ao
         desligar, e mandar só o interruptor deixaria a tela e o banco
         discordando sobre o que foi pedido. */
      importacao: { ligada, subgruposDestino: ligada ? [destinoEfetivo] : [] },
    });
  }

  function cancelar() {
    setNumeroOab(perfil.numero_oab ?? "");
    setUfOab(perfil.uf_oab ?? "");
    setLigada(perfil.importacao_automatica);
    setDestino(destinoSalvo);
  }

  return (
    <form onSubmit={handleSubmit}>
      <LinhaDeCampos>
        <Campo
          rotulo="Número da OAB"
          para="numero-oab-perfil"
          erro={erro?.campo === "numeroOab" ? erro.mensagem : undefined}
        >
          <Input
            id="numero-oab-perfil"
            value={numeroOab}
            onChange={(e) => setNumeroOab(e.target.value)}
            inputMode="numeric"
            placeholder="Só os dígitos"
          />
        </Campo>

        <Campo
          rotulo="UF"
          para="uf-oab-perfil"
          erro={erro?.campo === "ufOab" ? erro.mensagem : undefined}
        >
          <Select
            id="uf-oab-perfil"
            /* 🔴 A opção vazia é EXPLÍCITA, como em `CamposDeEndereco`: o
               `Select` não é clearable, e sem ela quem escolhesse uma UF nunca
               mais voltaria ao vazio -- e é o vazio, nas DUAS partes, que
               apaga a inscrição. */
            opcoes={[{ value: "", label: "Nenhuma" }, ...UFS.map((uf) => ({ value: uf, label: uf }))]}
            valor={ufOab}
            onMudar={setUfOab}
            largura="120px"
          />
        </Campo>
      </LinhaDeCampos>

      {/* Diz o que a inscrição FAZ, e não por que os dois campos andam
          juntos: o público é de ADVOGADOS, que sabem que a mesma numeração
          existe nas 27 seccionais. Quem preencher só um recebe o erro no
          campo certo; o apoio permanente é melhor gasto com o que não é
          óbvio.

          ⚠️ "Movimentações" é o termo que o produto já usa com o usuário (a
          aba do processo, o cartão, o subtítulo do Histórico). "Publicações"
          ou "intimações" criariam um segundo nome para a mesma coisa.

          ⚠️ E é verdade HOJE, não promessa: a varredura por OAB lê esta
          inscrição e roda três vezes ao dia. */}
      <Box mt="-8px" fontSize="11.5px" color="fg.subtle">
        Com a inscrição cadastrada, o sistema acompanha as movimentações que o tribunal
        publicar para ela — o interruptor abaixo é outra coisa.
      </Box>

      <InterruptorDaImportacao
        ligada={ligada}
        aoMudarLigada={setLigada}
        subgrupos={perfil.subgrupos}
        destino={destinoEfetivo}
        aoMudarDestino={setDestino}
        temInscricao={temInscricao}
        desabilitado={salvar.isPending}
      />

      <Box mt="16px" borderTopWidth="1px" borderTopColor="border.subtle">
        <RodapeDeAcoes>
          <Botao variante="ghost" onClick={cancelar} disabled={salvar.isPending || !mudou}>
            Cancelar
          </Botao>
          <Botao
            type="submit"
            disabled={salvar.isPending || Boolean(erro) || faltaDestino || !mudou}
          >
            {salvar.isPending ? "Salvando…" : "Salvar"}
          </Botao>
        </RodapeDeAcoes>
      </Box>
    </form>
  );
}
