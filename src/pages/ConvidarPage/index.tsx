import { Input } from "@chakra-ui/react";
import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";

import { Botao, Campo, Cartao, LinhaDeCampos, MultiSelect, Select } from "../../components";
import { useToast } from "../../contexts/ToastContext";
import {
  ESCOLHA_UM_SUBGRUPO,
  NOME_PAPEL,
  PAPEIS_CONVIDAVEIS,
  PAPEL_PADRAO_DO_CONVITE,
} from "../../constants";
import { criarConvite } from "../../services";
import { toastErroMutation } from "../../services/queryClient";
import { emailValido } from "../../utils";
import type { Papel } from "../../types";
import { comOpcoesEscolhidas, useSubgruposBuscaveis } from "../../hooks/useOpcoesBuscaveis";

/** Sub-aba "Convidar" da tela de Grupo.
 *
 * Convite é pra quem ainda NÃO tem conta -- quem já tem entra pelos
 * subgrupos, na aba Subgrupos. Por isso a tela é só um formulário: não há
 * lista pra mostrar.
 */
export default function ConvidarPage() {
  const [email, setEmail] = useState("");
  const [papelInicial, setPapelInicial] = useState<Papel>(PAPEL_PADRAO_DO_CONVITE);
  const [subgruposSelecionados, setSubgruposSelecionados] = useState<string[]>([]);
  const [erro, setErro] = useState("");
  const toast = useToast();

  /* Ligado desde a montagem: este formulário EXISTE pra escolher subgrupo, e
     o botão fica travado até haver um. Esperar a pessoa abrir o seletor pra
     só então pedir a lista atrasaria a única coisa que a tela faz. */
  const subgrupos = useSubgruposBuscaveis(true);
  /* Guarda o nome de quem foi escolhido: com só a primeira página carregada,
     digitar pra achar o segundo subgrupo tiraria o primeiro da lista -- e
     ele sumiria do valor, não só do rótulo. */
  const [nomesEscolhidos, setNomesEscolhidos] = useState<Record<string, string>>({});
  const opcoesDeSubgrupo = comOpcoesEscolhidas(
    subgrupos.opcoes,
    subgruposSelecionados,
    nomesEscolhidos,
  );

  const convidarMutation = useMutation({
    mutationFn: () => criarConvite(email.trim().toLowerCase(), papelInicial, subgruposSelecionados),
    onSuccess: () => {
      toast.sucesso(`Convite enviado pra ${email.trim().toLowerCase()}.`);
      setEmail("");
      setSubgruposSelecionados([]);
      // 🔴 O papel também. Limpar e-mail e subgrupos e DEIXAR o papel fazia
      // o formulário se apresentar como novo com metade do estado antigo:
      // quem convidou alguém como Admin e não reparasse no seletor mandava
      // o convite seguinte como Admin também. `PAPEIS_CONVIDAVEIS` inclui
      // `admin`.
      setPapelInicial(PAPEL_PADRAO_DO_CONVITE);
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
            opcoes={opcoesDeSubgrupo}
            selecionados={subgruposSelecionados}
            onMudar={(ids) => {
              setSubgruposSelecionados(ids);
              setNomesEscolhidos(
                Object.fromEntries(
                  ids.map((id) => [id, opcoesDeSubgrupo.find((o) => o.value === id)?.label ?? id]),
                ),
              );
            }}
            placeholder="Selecione os subgrupos"
            /* Sem isto, o seletor abria vazio e o botão "Convidar" ficava
               travado por `semSubgrupo` -- sem nada dizendo que era espera
               e não ausência de subgrupos.
               ⚠️ `carregandoPrimeiraVez`, e não `carregando`: aquele inclui a
               espera de cada busca, e travaria o campo a cada tecla. */
            carregando={subgrupos.carregandoPrimeiraVez}
            onBuscar={subgrupos.buscar}
            erro={subgrupos.erro}
            onTentarDeNovo={subgrupos.tentarDeNovo}
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
