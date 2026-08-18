import { useEffect, useRef, useState, type FormEvent } from "react";
import { listarMembrosDoGrupo, listarSubgruposDoGrupo, atualizarMembro, getGrupoId, ApiError } from "../../services";
import { MultiSelect, useToast } from "../../components";
import type { Membro, Subgrupo, Grupo, Papel } from "../../types";

interface EditarMembroFormProps {
  membro: Membro;
  grupos: Grupo[];
  onAtualizado: () => void;
  onFechar: () => void;
}

export default function EditarMembroForm({
  membro,
  grupos,
  onAtualizado,
  onFechar,
}: EditarMembroFormProps) {
  const grupoProprioId = getGrupoId() || "";
  const [apelido, setApelido] = useState(membro.apelido || "");
  const [grupoSelecionado, setGrupoSelecionado] = useState(grupoProprioId);
  const [papelSelecionado, setPapelSelecionado] = useState<Papel>((membro.papel as Papel) || "user");
  const [subgruposSelecionados, setSubgruposSelecionados] = useState<string[]>(membro.subgrupos || []);
  const [subgruposDoGrupo, setSubgruposDoGrupo] = useState<Subgrupo[]>([]);
  const [subgruposCarregados, setSubgruposCarregados] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const grupoAlteradoRef = useRef(false);
  const toast = useToast();

  // Anti-staleness: `membro.subgrupos` (prop) pode estar desatualizado se
  // alguém mexeu nos subgrupos dessa pessoa via "Membros por subgrupo" sem
  // recarregar a página -- busca fresco antes de liberar o submit, senão a
  // reconciliação do back (que substitui pelo conjunto exato enviado)
  // desfaria uma adição recente.
  useEffect(() => {
    listarMembrosDoGrupo()
      .then((d: any) => {
        if (grupoAlteradoRef.current) return;
        const fresco = (d.membros as Membro[]).find((m) => m.email === membro.email);
        if (fresco) setSubgruposSelecionados(fresco.subgrupos || []);
      })
      .finally(() => setSubgruposCarregados(true));
  }, [membro.email]);

  useEffect(() => {
    listarSubgruposDoGrupo(grupoSelecionado)
      .then((d: any) => setSubgruposDoGrupo(d.subgrupos || []))
      .catch(() => toast.erro("Não foi possível carregar os subgrupos desse grupo."));
  }, [grupoSelecionado, toast]);

  function handleMudarGrupo(novoGrupoId: string) {
    grupoAlteradoRef.current = true;
    setGrupoSelecionado(novoGrupoId);
    setSubgruposSelecionados([]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      await atualizarMembro(membro.email, {
        apelido: apelido.trim(),
        grupo_id: grupoSelecionado,
        papel: papelSelecionado,
        subgrupos: subgruposSelecionados,
      });
      toast.sucesso(`${membro.apelido || membro.email} atualizado.`);
      onAtualizado();
      onFechar();
    } catch (err) {
      toast.erro(err instanceof ApiError ? err.message : "Não foi possível atualizar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="apelido-membro">Apelido</label>
        <input
          id="apelido-membro"
          value={apelido}
          onChange={(e) => setApelido(e.target.value)}
          maxLength={512}
          autoFocus
        />
      </div>

      <div className="form-row" style={{ marginTop: 16 }}>
        <div className="field">
          <label htmlFor="papel-membro">Papel</label>
          <select
            id="papel-membro"
            value={papelSelecionado}
            onChange={(e) => setPapelSelecionado(e.target.value as Papel)}
          >
            <option value="user">Usuário</option>
            <option value="manager">Gerente</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="grupo-membro">Grupo</label>
          <select
            id="grupo-membro"
            value={grupoSelecionado}
            onChange={(e) => handleMudarGrupo(e.target.value)}
          >
            {grupos.map((g) => (
              <option key={g.grupo_id} value={g.grupo_id}>
                {g.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field" style={{ marginTop: 16 }}>
        <label htmlFor="subgrupos-membro">Subgrupos</label>
        <MultiSelect
          id="subgrupos-membro"
          opcoes={subgruposDoGrupo.map((s) => ({ value: s.subgrupo_id, label: s.nome }))}
          selecionados={subgruposSelecionados}
          onMudar={setSubgruposSelecionados}
          placeholder="Selecione os subgrupos"
        />
      </div>

      <div className="modal-actions">
        <button
          className="btn"
          type="submit"
          disabled={enviando || !subgruposCarregados || subgruposSelecionados.length === 0}
        >
          {enviando ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}
