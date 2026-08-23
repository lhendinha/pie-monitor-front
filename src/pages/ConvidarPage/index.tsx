import { Input } from "@chakra-ui/react";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import {
  Botao,
  Campo,
  Cartao,
  LinhaDeCampos,
  MultiSelect,
  Select,
  useToast,
} from "../../components";
import { ESCOLHA_UM_SUBGRUPO, NOME_PAPEL, PAPEIS_CONVIDAVEIS } from "../../constants";
import { criarConvite, listarSubgrupos } from "../../services";
import { toastErroMutation, useToastOnQueryError } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import { emailValido } from "../../utils";
import type { Papel, Subgrupo } from "../../types";

/** Sub-aba "Convidar" da tela de Grupo.
 *
 * Convite é pra quem ainda NÃO tem conta -- quem já tem entra pelos
 * subgrupos, na aba Subgrupos. Por isso a tela é só um formulário: não há
 * lista pra mostrar.
 */
export default function ConvidarPage() {
  const [email, setEmail] = useState("");
  const [papelInicial, setPapelInicial] = useState<Papel>("user");
  const [subgruposSelecionados, setSubgruposSelecionados] = useState<string[]>([]);
  const [erro, setErro] = useState("");
  const toast = useToast();

  const subgruposQuery = useQuery<{ subgrupos: Subgrupo[] }>({
    // O MultiSelect precisa da lista inteira, não de uma página.
    queryKey: qk.subgrupos({ tamanhoPagina: 100 }),
    queryFn: () => listarSubgrupos({ tamanhoPagina: 100 }),
  });
  useToastOnQueryError(subgruposQuery.error, "Não foi possível carregar os subgrupos.");
  const subgrupos = subgruposQuery.data?.subgrupos || [];

  const convidarMutation = useMutation({
    mutationFn: () => criarConvite(email.trim().toLowerCase(), papelInicial, subgruposSelecionados),
    onSuccess: () => {
      toast.sucesso(`Convite enviado pra ${email.trim().toLowerCase()}.`);
      setEmail("");
      setSubgruposSelecionados([]);
    },
    onError: (err) => {
      // O erro comum é o e-mail já ter conta ou convite aberto, e a mensagem
      // do servidor diz qual dos dois -- marcar o campo dá o "onde".
      setErro("Não foi possível convidar. Confira o e-mail.");
      toastErroMutation(toast, err, "Não foi possível convidar.");
    },
  });

  const limpo = email.trim().toLowerCase();
  // O servidor recusa do mesmo jeito -- isto é pra a pessoa não preencher o
  // resto do formulário pra tomar erro no fim.
  const emailRuim = limpo.length > 0 && !emailValido(limpo);
  const semSubgrupo = subgruposSelecionados.length === 0;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro("");
    convidarMutation.mutate();
  }

  return (
    <Cartao titulo="Convidar pra este grupo">
      {/* O `Campo` já espaça a si mesmo (16px embaixo) -- um `Stack` com
          intervalo aqui somaria os dois e dobraria o respiro. */}
      <form onSubmit={handleSubmit}>
        <LinhaDeCampos proporcoes="2fr 1fr">
          <Campo
            rotulo="E-mail"
            para="email-convite"
            obrigatorio
            erro={emailRuim ? "E-mail inválido." : erro || undefined}
          >
            <Input
              id="email-convite"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErro("");
              }}
            />
          </Campo>
          <Campo rotulo="Papel inicial" para="papel-convite">
            <Select
              id="papel-convite"
              opcoes={PAPEIS_CONVIDAVEIS.map((p) => ({ value: p, label: NOME_PAPEL[p] }))}
              valor={papelInicial}
              onMudar={(v) => setPapelInicial(v as Papel)}
            />
          </Campo>
        </LinhaDeCampos>

        <Campo
          rotulo="Subgrupos"
          para="subgrupos-convite"
          obrigatorio
          /* Só dica, sem versão de erro: aqui o botão fica desabilitado
             enquanto não houver subgrupo, então nunca dá pra tentar enviar
             sem um -- o erro não teria quando aparecer. */
          dica={ESCOLHA_UM_SUBGRUPO}
        >
          <MultiSelect
            id="subgrupos-convite"
            opcoes={subgrupos.map((s) => ({ value: s.subgrupo_id, label: s.nome }))}
            selecionados={subgruposSelecionados}
            onMudar={setSubgruposSelecionados}
            placeholder="Selecione os subgrupos"
            /* Sem isto, o seletor abria vazio e o botão "Convidar" ficava
               travado por `semSubgrupo` -- sem nada dizendo que era espera
               e não ausência de subgrupos. */
            carregando={subgruposQuery.isPending}
          />
        </Campo>

        <Botao
          type="submit"
          disabled={convidarMutation.isPending || !limpo || emailRuim || semSubgrupo}
        >
          {convidarMutation.isPending ? "Enviando…" : "Convidar"}
        </Botao>
      </form>
    </Cartao>
  );
}
