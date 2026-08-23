import { useState } from "react";

import { Abas, CabecalhoDePagina } from "../../components";
import { ABAS_DO_GRUPO } from "../../constants";
import { papelAtende } from "../../services";
import ConvidarPage from "../ConvidarPage";
import MembrosPage from "../MembrosPage";
import SubgruposPage from "../SubgruposPage";
import OpcoesLista from "./components/OpcoesLista";
import type { SubAbaId } from "../../types";

/** Agrupa Subgrupos/Membros/Convidar/Fases/Situações -- itens de gestão do
 * grupo (menos usados no dia a dia que Processos/Clientes/Histórico) --
 * numa tela só, com sub-navegação própria. Cada sub-aba mantém exatamente
 * o mesmo piso de papel que já tinha quando era aba de topo. */
export default function GrupoPage() {
  const abas = ABAS_DO_GRUPO.filter((a) => papelAtende(a.minimo));
  const [abaAtiva, setAbaAtiva] = useState<SubAbaId>(abas[0]?.id || "subgrupos");

  return (
    <>
      <CabecalhoDePagina titulo="Grupo" subtitulo="Gestão de definições do grupo." />

      <Abas
        abas={abas.map((a) => ({ id: a.id, rotulo: a.label }))}
        ativa={abaAtiva}
        onMudar={setAbaAtiva}
      />

      {abaAtiva === "subgrupos" && <SubgruposPage />}
      {abaAtiva === "membros" && <MembrosPage />}
      {abaAtiva === "fases" && <OpcoesLista tipo="fase" titulo="Fases" nomeSingular="fase" />}
      {abaAtiva === "situacoes" && <OpcoesLista tipo="situacao" titulo="Situações" nomeSingular="situação" />}
      {abaAtiva === "convidar" && <ConvidarPage />}
    </>
  );
}
