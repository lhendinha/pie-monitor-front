import { Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { CartaoDeTabela, Esqueleto, Pagination } from "../../components";
import { TAMANHO_PAGINA_PADRAO } from "../../constants";
import { ehSuperAdmin, listarGrupos, listarMembrosDoGrupo, listarSubgrupos } from "../../services";
import { useToastOnQueryError } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import EditarMembroForm from "./components/EditarMembroForm";
import TabelaDeMembros from "./components/TabelaDeMembros";
import type { Grupo, Membro, Subgrupo } from "../../types";

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

  const membrosQuery = useQuery<{ membros: Membro[] }>({
    queryKey: qk.membros(),
    queryFn: listarMembrosDoGrupo,
  });
  useToastOnQueryError(membrosQuery.error, "Não foi possível carregar os membros.");

  const subgruposQuery = useQuery<{ subgrupos: Subgrupo[] }>({
    // A lista inteira, e não uma página: os nomes daqui resolvem os ids
    // que vêm em `membro.subgrupos`, e qualquer pessoa pode estar em
    // qualquer subgrupo do grupo.
    queryKey: qk.subgrupos({ tamanhoPagina: 100 }),
    queryFn: () => listarSubgrupos({ tamanhoPagina: 100 }),
  });
  useToastOnQueryError(subgruposQuery.error, "Não foi possível carregar os subgrupos.");

  const gruposQuery = useQuery<{ grupos: Grupo[] }>({
    queryKey: qk.grupos(),
    queryFn: listarGrupos,
    enabled: podeEditar,
  });
  useToastOnQueryError(gruposQuery.error, "Não foi possível carregar os grupos.");

  const pessoas = membrosQuery.data?.membros || [];
  const subgrupos = subgruposQuery.data?.subgrupos || [];
  const grupos = gruposQuery.data?.grupos || [];

  /** `GET /grupos/membros` devolve o grupo inteiro de uma vez -- não é rota
   * paginada. A página é recortada aqui mesmo; num grupo com dezenas de
   * pessoas, a tabela sem corte viraria uma rolagem sem fim. */
  const inicio = (pagina - 1) * tamanhoPagina;
  const pessoasDaPagina = pessoas.slice(inicio, inicio + tamanhoPagina);
  const totalPaginas = Math.ceil(pessoas.length / tamanhoPagina);

  /** `membro.subgrupos` traz ids, e id não diz nada pra quem lê. */
  const nomePorSubgrupoId = new Map(subgrupos.map((s) => [s.subgrupo_id, s.nome]));

  function recarregarTudo() {
    queryClient.invalidateQueries({ queryKey: qk.membros() });
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
      ) : (
        <CartaoDeTabela>
          <TabelaDeMembros
            membros={pessoasDaPagina}
            nomeDoSubgrupo={(id) => nomePorSubgrupoId.get(id) || ""}
            podeEditar={podeEditar}
            onEditar={setMembroEmEdicao}
          />
          <Pagination
            pagina={pagina}
            totalPaginas={totalPaginas}
            total={pessoas.length}
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
