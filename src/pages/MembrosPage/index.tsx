import { Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { CartaoDeTabela, EstadoDeErro, Esqueleto, Pagination } from "../../components";
import { TAMANHO_PAGINA_PADRAO } from "../../constants";
import { ehSuperAdmin, listarGrupos, listarMembrosDoGrupo } from "../../services";
import { useToastOnQueryError } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import EditarMembroForm from "./components/EditarMembroForm";
import TabelaDeMembros from "./components/TabelaDeMembros";
import type { Membro } from "../../types";
import type {
  RespostaDeGrupos,
  RespostaDeMembrosPaginada,
} from "../../types/respostas";

/** Sub-aba "Membros" da tela de Grupo.
 *
 * Uma tabela só, como no artifact. Esta tela é sobre PESSOAS: quem é, o que
 * pode, e em que subgrupos está. A pergunta do outro lado -- "quem está no
 * subgrupo X?" -- é respondida na aba Subgrupos, clicando na contagem de
 * membros da linha. Cada aba com um assunto.
 */
export default function MembrosPage() {
  const [membroEmEdicao, setMembroEmEdicao] = useState<Membro | null>(null);
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO);
  const queryClient = useQueryClient();

  const podeEditar = ehSuperAdmin();

  // 🔴 A rota É paginada no servidor. Esta tela agora pede a página que está
  // vendo, em vez de receber as 10 primeiras e fatiar por cima delas.
  const membrosQuery = useQuery<RespostaDeMembrosPaginada>({
    queryKey: qk.membros({ pagina, tamanhoPagina }),
    queryFn: () => listarMembrosDoGrupo({ pagina, tamanhoPagina }),
    placeholderData: (anterior) => anterior,
  });
  useToastOnQueryError(membrosQuery.error, "Não foi possível carregar os membros.");


  const gruposQuery = useQuery<RespostaDeGrupos>({
    queryKey: qk.grupos(),
    queryFn: listarGrupos,
    enabled: podeEditar,
  });
  useToastOnQueryError(gruposQuery.error, "Não foi possível carregar os grupos.");

  const pessoas = membrosQuery.data?.membros || [];
  const grupos = gruposQuery.data?.grupos || [];

  /** 🔴 O recorte agora é do SERVIDOR.
   *
   * Antes esta tela chamava a rota sem query nenhuma, recebia as 10
   * primeiras pessoas e fatiava por cima -- e o total era `pessoas.length`,
   * ou seja, 10. Como `Pagination` se esconde quando o total cabe na menor
   * página, a barra sumia: num escritório de 14 pessoas, 4 não existiam na
   * tela e não havia página 2 pra clicar. O comentário aqui afirmava que a
   * rota "devolve o grupo inteiro de uma vez"; nunca devolveu. */
  const pessoasDaPagina = pessoas;
  const total = membrosQuery.data?.total ?? 0;
  const totalPaginas = membrosQuery.data?.total_paginas ?? 1;

  function recarregarTudo() {
    // 🔴 PREFIXO nu, não `qk.membros()`. A chave virou `["membros", {}]`, e o
    // `partialMatchKey` do React Query rejeita `{}` contra a string `"todos"`
    // por tipo -- então invalidar com `qk.membros()` não alcançava
    // `qk.todosOsMembros()` nem os membros de subgrupo. O sino fica montado a
    // sessão inteira: editar o apelido de alguém não derrubava o cache dele,
    // e o nome antigo seguia na tela até a janela recuperar o foco.
    queryClient.invalidateQueries({ queryKey: ["membros"] });
    queryClient.invalidateQueries({ queryKey: ["subgrupos"] });
    if (podeEditar) queryClient.invalidateQueries({ queryKey: qk.grupos() });
  }

  return (
    <Stack gap="16px">
      {!podeEditar && (
        /* Dizer por que a linha não abre é melhor que uma tabela que
           simplesmente não reage ao clique. */
        <Text fontSize="11.5px" color="fg.subtle">
          Só super admin pode editar membros.
        </Text>
      )}

      {membrosQuery.isPending ? (
        <Esqueleto linhas={3} />
      ) : membrosQuery.isError ? (
        <CartaoDeTabela>
          <EstadoDeErro
            mensagem="Não foi possível carregar os membros."
            onTentarDeNovo={() => membrosQuery.refetch()}
            tentando={membrosQuery.isFetching}
          />
        </CartaoDeTabela>
      ) : (
        <CartaoDeTabela>
          <TabelaDeMembros
            membros={pessoasDaPagina}
            podeEditar={podeEditar}
            onEditar={setMembroEmEdicao}
          />
          <Pagination
            pagina={pagina}
            totalPaginas={totalPaginas}
            total={total}
            tamanhoPagina={tamanhoPagina}
            onMudarPagina={setPagina}
            onMudarTamanho={(t) => {
              setTamanhoPagina(t);
              setPagina(1);
            }}
          />
        </CartaoDeTabela>
      )}

      {membroEmEdicao && (
        <EditarMembroForm
          membro={membroEmEdicao}
          grupos={grupos}
          onAtualizado={recarregarTudo}
          onFechar={() => setMembroEmEdicao(null)}
        />
      )}
    </Stack>
  );
}
