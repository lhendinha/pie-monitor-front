import { useState } from "react";

import { Abas, CabecalhoDePagina, PainelDaAba } from "../../components";
import { ABAS_DO_GRUPO } from "../../constants";
import { papelAtende } from "../../services";
import ConfiguracoesDoGrupo from "./components/ConfiguracoesDoGrupo";
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
        grupo="grupo"
        abas={abas.map((a) => ({ id: a.id, rotulo: a.label }))}
        ativa={abaAtiva}
        onMudar={setAbaAtiva}
      />

      {/* ⚠️ O conteúdo continua CONDICIONAL aqui, ao contrário das telas de
          detalhe: cada aba é uma página inteira com consultas próprias, e
          montar as seis de uma vez dispararia todas juntas. O painel existe
          pra o `aria-controls` da aba ter onde apontar -- vazio quando
          inativo, o que é correto. */}
      <PainelDaAba grupo="grupo" id="subgrupos" ativa={abaAtiva}>
        {abaAtiva === "subgrupos" && <SubgruposPage />}
      </PainelDaAba>
      <PainelDaAba grupo="grupo" id="membros" ativa={abaAtiva}>
        {abaAtiva === "membros" && <MembrosPage />}
      </PainelDaAba>
      <PainelDaAba grupo="grupo" id="fases" ativa={abaAtiva}>
        {abaAtiva === "fases" && <OpcoesLista tipo="fase" titulo="Fases" nomeSingular="fase" />}
      </PainelDaAba>
      <PainelDaAba grupo="grupo" id="situacoes" ativa={abaAtiva}>
        {abaAtiva === "situacoes" && (
          <OpcoesLista tipo="situacao" titulo="Situações" nomeSingular="situação" />
        )}
      </PainelDaAba>
      <PainelDaAba grupo="grupo" id="convidar" ativa={abaAtiva}>
        {abaAtiva === "convidar" && <ConvidarPage />}
      </PainelDaAba>
      <PainelDaAba grupo="grupo" id="configuracoes" ativa={abaAtiva}>
        {abaAtiva === "configuracoes" && <ConfiguracoesDoGrupo />}
      </PainelDaAba>
    </>
  );
}
