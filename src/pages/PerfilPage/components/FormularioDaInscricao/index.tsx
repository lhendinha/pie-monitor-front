import { Box, Input } from "@chakra-ui/react";
import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  Botao,
  Campo,
  Esqueleto,
  EstadoDeErro,
  LinhaDeCampos,
  RodapeDeAcoes,
  Select,
  useToast,
} from "../../../../components";
import { atualizarMeuPerfil, lerMeuPerfil } from "../../../../services";
import { toastErroMutation } from "../../../../services/queryClient";
import { qk } from "../../../../services/queryKeys";
import { UFS } from "../../../../constants";
import { erroDaInscricao } from "../../../../utils/oab";
import type { MeuPerfil } from "../../../../types";

/** Aba "Inscrição na OAB": a própria inscrição da pessoa.
 *
 * 🔴 **Esta aba CONSULTA `GET /me`, e a de dados não.** A inscrição não está
 * na sessão -- o login não a devolve -- e não deveria estar: seria uma cópia
 * que envelhece. Sem a consulta, a tela mostraria os campos vazios para quem
 * já cadastrou, e a pessoa cadastraria de novo. É o defeito que o `GET /me`
 * existe para evitar.
 *
 * ⚠️ Salva SÓ a inscrição, e isso é estrutural: a aba não conhece o campo do
 * nome, então não há como mandá-lo por engano num PATCH que o servidor
 * trataria como "sobrescreve".
 */
export default function FormularioDaInscricao() {
  const [numeroOab, setNumeroOab] = useState("");
  const [ufOab, setUfOab] = useState("");
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
      setNumeroOab(query.data.numero_oab ?? "");
      setUfOab(query.data.uf_oab ?? "");
    }
  }, [query.data]);

  const salvar = useMutation({
    mutationFn: (inscricao: { numero: string; uf: string }) =>
      atualizarMeuPerfil({ inscricao }),
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
  const mudou =
    numeroLimpo !== (perfil.numero_oab ?? "") || ufOab !== (perfil.uf_oab ?? "");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (erro || !mudou) return;
    salvar.mutate({ numero: numeroLimpo, uf: ufOab });
  }

  function cancelar() {
    setNumeroOab(perfil.numero_oab ?? "");
    setUfOab(perfil.uf_oab ?? "");
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

      {/* 🔴 Diz o que a inscrição FAZ, e não por que os dois campos andam
          juntos. A versão anterior explicava que a mesma numeração existe nas
          27 seccionais -- para um público de ADVOGADOS, que é justamente quem
          já sabe disso. Quem preencher só um recebe o erro no campo certo; o
          apoio permanente é melhor gasto com o que não é óbvio.

          ⚠️ "Movimentações" é o termo que o produto já usa com o usuário (a
          aba do processo, o cartão, o subtítulo do Histórico). "Publicações"
          ou "intimações" criariam um segundo nome para a mesma coisa.

          ⚠️ E é verdade HOJE, não promessa: a varredura por OAB lê esta
          inscrição e roda três vezes ao dia.

          A outra frase do protótipo ("estar cadastrado já faz o sistema
          VIGIAR… o interruptor abaixo é outra coisa") fica de fora enquanto o
          interruptor da Fase 1b não existir -- frase que cita controle ausente
          é pior que frase nenhuma. */}
      <Box mt="-8px" fontSize="11.5px" color="fg.subtle">
        Com a inscrição cadastrada, o sistema acompanha as movimentações que o tribunal
        publicar para ela.
      </Box>

      <Box mt="16px" borderTopWidth="1px" borderTopColor="border.subtle">
        <RodapeDeAcoes>
          <Botao variante="ghost" onClick={cancelar} disabled={salvar.isPending || !mudou}>
            Cancelar
          </Botao>
          <Botao type="submit" disabled={salvar.isPending || Boolean(erro) || !mudou}>
            {salvar.isPending ? "Salvando…" : "Salvar"}
          </Botao>
        </RodapeDeAcoes>
      </Box>
    </form>
  );
}
