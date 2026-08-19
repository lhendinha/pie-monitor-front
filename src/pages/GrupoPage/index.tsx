import { useState } from "react";
import { papelAtende } from "../../services";
import SubgruposPage from "../SubgruposPage";
import MembrosPage from "../MembrosPage";
import ConvidarPage from "../ConvidarPage";
import OpcoesLista from "./OpcoesLista";
import type { SubAbaConfig, SubAbaId } from "../../types";

const SUB_ABAS: SubAbaConfig[] = [
  { id: "subgrupos", label: "Subgrupos", minimo: "user" },
  { id: "membros", label: "Membros", minimo: "manager" },
  { id: "convidar", label: "Convidar", minimo: "admin" },
  { id: "fases", label: "Fases", minimo: "super_admin" },
  { id: "situacoes", label: "Situações", minimo: "super_admin" },
];

/** Agrupa Subgrupos/Membros/Convidar/Fases/Situações -- itens de gestão do
 * grupo (menos usados no dia a dia que Processos/Clientes/Histórico) --
 * numa aba só, com sub-navegação própria. Cada sub-aba mantém exatamente
 * o mesmo piso de papel que já tinha quando era aba de topo. */
export default function GrupoPage() {
  const subAbas = SUB_ABAS.filter((a) => papelAtende(a.minimo));
  const [subAbaAtiva, setSubAbaAtiva] = useState<SubAbaId>(subAbas[0]?.id || "subgrupos");

  return (
    <>
      <nav className="tabs tabs--sub">
        {subAbas.map((aba) => (
          <button
            key={aba.id}
            className={`tab ${subAbaAtiva === aba.id ? "active" : ""}`}
            onClick={() => setSubAbaAtiva(aba.id)}
          >
            {aba.label}
          </button>
        ))}
      </nav>

      {subAbaAtiva === "subgrupos" && <SubgruposPage />}
      {subAbaAtiva === "membros" && <MembrosPage />}
      {subAbaAtiva === "convidar" && <ConvidarPage />}
      {subAbaAtiva === "fases" && <OpcoesLista tipo="fase" titulo="Fases" />}
      {subAbaAtiva === "situacoes" && <OpcoesLista tipo="situacao" titulo="Situações" />}
    </>
  );
}
