import { Box, Flex, Input } from "@chakra-ui/react";
import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  Botao,
  BotaoDeLink,
  Campo,
  Esqueleto,
  EstadoDeErro,
  IconeCadeado,
  LinhaDeCampos,
  RodapeDeAcoes,
  RotuloDeSecao,
  Select,
  useToast,
} from "../../../../components";
import { useSessaoContexto } from "../../../../contexts/SessaoContext";
import { atualizarMeuPerfil, getEmail, lerMeuPerfil } from "../../../../services";
import { toastErroMutation } from "../../../../services/queryClient";
import { qk } from "../../../../services/queryKeys";
import { TAMANHO_MAXIMO_DO_APELIDO, UFS } from "../../../../constants";
import { erroDaInscricao } from "../../../../utils/oab";
import type { MeuPerfil } from "../../../../types";

interface FormularioIdentificacaoProps {
  onAlterarSenha: () => void;
}

/** Identificação da conta: apelido, e-mail e a inscrição da OAB.
 *
 * 🔴 **Passou a consultar `GET /me`, e o texto anterior dizia o contrário.**
 * Ele afirmava "não há consulta -- apelido e e-mail já estão na sessão", e era
 * verdade até a inscrição existir. A OAB **não** está na sessão e não tem como
 * estar: o login não a devolve, e guardá-la ali criaria uma cópia que
 * envelhece. Sem a consulta, a tela mostraria os campos vazios para quem já
 * cadastrou -- e a pessoa cadastraria de novo.
 *
 * ⚠️ **O apelido continua vindo do CONTEXTO, não da consulta**, e isso é
 * deliberado: é ele que faz a topbar re-renderizar depois de salvar, e
 * `trocarApelido` mantém contexto e storage em acordo. Trocar a fonte agora
 * misturaria duas mudanças numa entrega -- a consulta existe pela OAB.
 */
export default function FormularioIdentificacao({ onAlterarSenha }: FormularioIdentificacaoProps) {
  const email = getEmail() || "";
  // ⚠️ `apelidoSalvo` vem do CONTEXTO. Lido de `getApelido()` no render, o
  // React Compiler o congelava: depois de salvar, `mudou` continuava `true`
  // (o botão "Salvar" parecia não ter funcionado) e "Cancelar" devolvia o
  // nome ANTIGO, que já não era o do servidor.
  const { apelido: apelidoSalvo, trocarApelido } = useSessaoContexto();
  const [apelido, setApelido] = useState(apelidoSalvo);
  const [numeroOab, setNumeroOab] = useState("");
  const [ufOab, setUfOab] = useState("");
  const toast = useToast();
  const queryClient = useQueryClient();

  const query = useQuery<MeuPerfil>({
    queryKey: qk.meuPerfil(),
    queryFn: () => lerMeuPerfil(),
  });

  /* Os campos nascem do que está salvo -- mesmo arranjo de
     `ConfiguracoesDoGrupo`. Sem isto abririam vazios, e um "Salvar" sem querer
     apagaria a inscrição de quem já tem. */
  useEffect(() => {
    if (query.data) {
      setNumeroOab(query.data.numero_oab ?? "");
      setUfOab(query.data.uf_oab ?? "");
    }
  }, [query.data]);

  const salvar = useMutation({
    mutationFn: (campos: Parameters<typeof atualizarMeuPerfil>[0]) => atualizarMeuPerfil(campos),
    onSuccess: (_, campos) => {
      // Grava no storage E no estado da sessão -- é o estado que faz a
      // topbar e este formulário re-renderizarem com o nome novo.
      if (campos.apelido !== undefined) trocarApelido(campos.apelido);
      /* A inscrição volta do servidor normalizada; reler é o que impede a
         tela de afirmar o que ela mandou em vez do que ficou gravado. */
      queryClient.invalidateQueries({ queryKey: qk.meuPerfil() });
      toast.sucesso("Perfil atualizado.");
    },
    onError: (err) => toastErroMutation(toast, err, "Não foi possível salvar."),
  });

  if (query.isPending) return <Esqueleto linhas={4} />;
  if (query.isError) {
    return (
      <EstadoDeErro
        mensagem="Não foi possível carregar o seu perfil."
        onTentarDeNovo={() => query.refetch()}
        tentando={query.isFetching}
      />
    );
  }

  const perfil = query.data!;
  const apelidoLimpo = apelido.trim();
  const numeroLimpo = numeroOab.trim();

  /* ⚠️ `obrigatoria: false`: as duas vazias é o estado VÁLIDO que significa
     "não tenho OAB" -- e é o único jeito de apagar uma cadastrada por engano.
     A busca por OAB usa a mesma régua com `true`, porque lá não há o que
     buscar sem inscrição. */
  const erroInscricao = erroDaInscricao(numeroOab, ufOab, { obrigatoria: false });

  const apelidoMudou = apelidoLimpo !== apelidoSalvo;
  const inscricaoMudou =
    numeroLimpo !== (perfil.numero_oab ?? "") || ufOab !== (perfil.uf_oab ?? "");

  const invalido = !apelidoLimpo || Boolean(erroInscricao);
  const inalterado = !apelidoMudou && !inscricaoMudou;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (invalido || inalterado) return;
    /* 🔴 Só o que MUDOU vai no PATCH, e aqui isso é requisito, não economia:
       o corpo do servidor trata campo AUSENTE como "não mexer", e mandar o
       apelido junto de uma troca de OAB o reescreveria -- foi por essa razão
       que `apelido` virou opcional no schema de lá. */
    salvar.mutate({
      ...(apelidoMudou ? { apelido: apelidoLimpo } : {}),
      ...(inscricaoMudou ? { inscricao: { numero: numeroLimpo, uf: ufOab } } : {}),
    });
  }

  function cancelar() {
    setApelido(apelidoSalvo);
    setNumeroOab(perfil.numero_oab ?? "");
    setUfOab(perfil.uf_oab ?? "");
  }

  return (
    <form onSubmit={handleSubmit}>
      <RotuloDeSecao primeiro>Informações pessoais</RotuloDeSecao>

      <Campo rotulo="Apelido" para="apelido-perfil" obrigatorio>
        <Input
          id="apelido-perfil"
          value={apelido}
          onChange={(e) => setApelido(e.target.value)}
          maxLength={TAMANHO_MAXIMO_DO_APELIDO}
          placeholder="Como quer ser chamado"
        />
      </Campo>

      <RotuloDeSecao>Inscrição na OAB</RotuloDeSecao>

      <LinhaDeCampos>
        <Campo
          rotulo="Número"
          para="numero-oab-perfil"
          erro={erroInscricao?.campo === "numeroOab" ? erroInscricao.mensagem : undefined}
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
          erro={erroInscricao?.campo === "ufOab" ? erroInscricao.mensagem : undefined}
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

      {/* ⚠️ Diz o que a inscrição FAZ, e não o que ela é: sem isto, um campo
          de OAB no perfil parece cadastro burocrático. Quem cadastra precisa
          saber que é isso que faz o sistema vigiar os processos dela. */}
      <Box mt="-8px" mb="16px" fontSize="11.5px" color="fg.subtle">
        Com a inscrição cadastrada, o sistema acompanha os processos que o tribunal
        publicar para ela. Deixe os dois campos vazios para remover.
      </Box>

      <RotuloDeSecao>Conta</RotuloDeSecao>

      <Campo
        rotulo="E-mail"
        para="email-perfil"
        dica="O e-mail é o identificador da sua conta e não pode ser alterado."
      >
        <Box position="relative">
          <Input id="email-perfil" value={email} disabled pr="38px" />
          <Box
            position="absolute"
            right="12px"
            top="50%"
            transform="translateY(-50%)"
            color="fg.subtle"
            css={{ "& svg": { width: "15px", height: "15px" } }}
          >
            <IconeCadeado />
          </Box>
        </Box>
      </Campo>

      {/* Senha em modal, e não como terceira seção: trocar senha é outra
          operação, com outra confirmação e outro risco. No mesmo formulário
          um "Salvar" só ficaria ambíguo -- salvaria o quê? */}
      <Flex>
        <BotaoDeLink type="button" onClick={onAlterarSenha}>
          Alterar senha atual
        </BotaoDeLink>
      </Flex>

      <Box mt="20px" borderTopWidth="1px" borderTopColor="border.subtle">
        <RodapeDeAcoes>
          <Botao
            variante="ghost"
            onClick={cancelar}
            disabled={salvar.isPending || inalterado}
          >
            Cancelar
          </Botao>
          <Botao type="submit" disabled={salvar.isPending || invalido || inalterado}>
            {salvar.isPending ? "Salvando…" : "Salvar"}
          </Botao>
        </RodapeDeAcoes>
      </Box>
    </form>
  );
}
