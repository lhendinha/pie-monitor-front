import { Box, Input } from "@chakra-ui/react";
import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Botao, Campo, DicaDeCampo, RodapeDeAcoes } from "../../../../components";
import { useToast } from "../../../../contexts/ToastContext";
import { useSessaoContexto } from "../../../../contexts/SessaoContext";
import { atualizarMeuPerfil } from "../../../../services";
import { toastErroMutation } from "../../../../services/queryClient";
import { qk } from "../../../../services/queryKeys";
import { TAMANHO_MAXIMO_DO_APELIDO } from "../../../../constants";
import DadosDaConta from "../DadosDaConta";

interface FormularioDeDadosProps {
  onAlterarSenha: () => void;
}

/** Aba "Meus dados": quem eu sou e como entro.
 *
 * 🔴 **Não consulta `GET /me`**, ao contrário da aba da inscrição. Nome e
 * e-mail já estão na sessão, e ir à rede buscar o que está em mãos faria a
 * tela piscar sem ganho. Quem precisa da consulta é a OAB, que a sessão não
 * carrega -- e não deveria carregar: seria uma cópia que envelhece.
 *
 * ⚠️ `apelidoSalvo` vem do CONTEXTO. Lido de `getApelido()` no render, o React
 * Compiler o congelava: depois de salvar, `mudou` continuava `true` (o botão
 * parecia não ter funcionado) e "Cancelar" devolvia o nome ANTIGO.
 *
 * ⚠️ Salva SÓ o nome, e isso agora é estrutural: a aba não conhece os campos
 * da OAB, então não há como mandá-los por engano num PATCH que o servidor
 * trataria como "sobrescreve".
 */
export default function FormularioDeDados({ onAlterarSenha }: FormularioDeDadosProps) {
  const { apelido: apelidoSalvo, trocarApelido } = useSessaoContexto();
  const [apelido, setApelido] = useState(apelidoSalvo);
  const toast = useToast();
  const queryClient = useQueryClient();

  const salvar = useMutation({
    mutationFn: (nome: string) => atualizarMeuPerfil({ apelido: nome }),
    onSuccess: (_, nome) => {
      // Grava no storage E no estado da sessão -- é o estado que faz a topbar
      // e este formulário re-renderizarem com o nome novo.
      trocarApelido(nome);
      /* A outra aba lê o mesmo `GET /me`, que devolve o apelido junto. Sem
         invalidar, ela ficaria com o nome antigo em cache. */
      queryClient.invalidateQueries({ queryKey: qk.meuPerfil() });
      toast.sucesso("Perfil atualizado.");
    },
    onError: (err) => toastErroMutation(toast, err, "Não foi possível salvar."),
  });

  const limpo = apelido.trim();
  const mudou = limpo !== apelidoSalvo;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!limpo || !mudou) return;
    salvar.mutate(limpo);
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* 🔴 "Nome completo", e não "Apelido" -- só o RÓTULO muda. Atrás
          continua o mesmo campo `apelido`, sem migração: o nome novo vale
          onde a PESSOA lê, mesma régua de `pje-monitor` vs Argos.

          ⚠️ Medido em produção: os cinco apelidos existentes têm uma palavra
          só, de 4 a 7 caracteres. Ninguém tem nome completo hoje, e a decisão
          foi NÃO migrar nem preencher automático -- inventar o nome de alguém
          é pior que pedir que ela o escreva. Quem explica é o "i". */}
      <Campo
        rotulo="Nome completo"
        para="apelido-perfil"
        obrigatorio
        aposORotulo={
          <DicaDeCampo rotulo="Por que o nome completo importa">
            <Box as="strong" color="fg" display="block" mb="6px">
              Por que o nome completo importa
            </Box>
            {/* ⚠️ Terminava com "Um apelido não bate." -- tirado em
                31/08/2026. A frase anterior já diz que a comparação é com o
                nome do tribunal; acrescentar o que NÃO serve é repetir pela
                negativa, e soa como reprimenda a quem ainda não preencheu. */}
            Ele é o que o sistema vai comparar com o nome que o tribunal devolve para a
            sua inscrição na OAB, para confirmar que ela é sua.
          </DicaDeCampo>
        }
      >
        <Input
          id="apelido-perfil"
          value={apelido}
          onChange={(e) => setApelido(e.target.value)}
          maxLength={TAMANHO_MAXIMO_DO_APELIDO}
          placeholder="Como você assina nos autos"
        />
      </Campo>

      <DadosDaConta onAlterarSenha={onAlterarSenha} />

      <Box mt="16px" borderTopWidth="1px" borderTopColor="border.subtle">
        <RodapeDeAcoes>
          <Botao
            variante="ghost"
            onClick={() => setApelido(apelidoSalvo)}
            disabled={salvar.isPending || !mudou}
          >
            Cancelar
          </Botao>
          <Botao type="submit" disabled={salvar.isPending || !limpo || !mudou}>
            {salvar.isPending ? "Salvando…" : "Salvar"}
          </Botao>
        </RodapeDeAcoes>
      </Box>
    </form>
  );
}
