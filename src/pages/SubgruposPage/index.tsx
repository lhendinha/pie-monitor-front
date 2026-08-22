import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CartaoDeTabela, Esqueleto, Pagination, useToast } from "../../components";
import { TAMANHO_PAGINA_PADRAO } from "../../constants";
import {
  atualizarSubgrupo,
  listarSubgrupos,
  papelAtende,
  removerSubgrupo,
} from "../../services";
import { toastErroMutation, useToastOnQueryError } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import FormularioNovoSubgrupo from "./components/FormularioNovoSubgrupo";
import ListaDeSubgrupos from "./components/ListaDeSubgrupos";
import type { Subgrupo } from "../../types";

/** Sub-aba "Subgrupos" da tela de Grupo.
 *
 * Não tem cabeçalho próprio: o título é o da página de Grupo, e as abas
 * ficam logo acima. Repetir "Subgrupos" aqui seria dizer duas vezes.
 *
 * Criar, renomear e excluir acontecem todos DENTRO do cartão da lista, sem
 * modal nenhum -- é o desenho do artifact, e cada ação aqui é de um campo
 * só.
 */
export default function SubgruposPage() {
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO);
  const [renomeandoId, setRenomeandoId] = useState<string | null>(null);
  const toast = useToast();
  const queryClient = useQueryClient();

  const podeCriar = papelAtende("manager");
  const podeEditar = papelAtende("admin");
  const podeExcluir = papelAtende("admin");

  const query = useQuery<{ subgrupos: Subgrupo[]; total: number; total_paginas: number }>({
    queryKey: qk.subgrupos({ pagina, tamanhoPagina }),
    queryFn: () => listarSubgrupos({ pagina, tamanhoPagina }),
  });
  useToastOnQueryError(query.error, "Não foi possível carregar os subgrupos.");

  const subgrupos = query.data?.subgrupos || [];
  const total = query.data?.total ?? 0;
  const totalPaginas = query.data?.total_paginas ?? 0;

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: ["subgrupos"] });
  }

  const renomearMutation = useMutation({
    mutationFn: ({ id, nome }: { id: string; nome: string }) => atualizarSubgrupo(id, nome),
    onSuccess: () => {
      invalidar();
      toast.sucesso("Subgrupo renomeado.");
    },
    // O servidor recusa nome repetido dentro do grupo -- a mensagem dele já
    // diz qual é o problema.
    onError: (err) => toastErroMutation(toast, err, "Não foi possível renomear."),
    onSettled: () => setRenomeandoId(null),
  });

  const removerMutation = useMutation({
    mutationFn: (id: string) => removerSubgrupo(id),
    onSuccess: invalidar,
    // O servidor recusa remover subgrupo com membro dentro
    // (`SubgrupoNaoVazio`) -- a mensagem dele já explica o motivo.
    onError: (err) => toastErroMutation(toast, err, "Não foi possível remover."),
  });

  function confirmarRemocao(s: Subgrupo) {
    if (window.confirm(`Remover o subgrupo "${s.nome}"? Só funciona se estiver vazio.`)) {
      removerMutation.mutate(s.subgrupo_id);
    }
  }

  if (query.isPending) return <Esqueleto linhas={2} />;

  return (
    <CartaoDeTabela>
      {podeCriar && <FormularioNovoSubgrupo onCriado={invalidar} />}

      <ListaDeSubgrupos
        subgrupos={subgrupos}
        podeEditar={podeEditar}
        podeExcluir={podeExcluir}
        renomeandoId={renomeandoId}
        onIniciarRenome={(s) => setRenomeandoId(s.subgrupo_id)}
        onRenomear={(s, nome) => renomearMutation.mutate({ id: s.subgrupo_id, nome })}
        onCancelarRenome={() => setRenomeandoId(null)}
        onRemover={confirmarRemocao}
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
  );
}
