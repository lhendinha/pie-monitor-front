import type { Papel } from "../types";

/** Rótulo em português exibido na UI pra cada papel. */
export const NOME_PAPEL: Record<Papel, string> = {
  user: "Usuário",
  manager: "Gerente",
  admin: "Admin",
  super_admin: "Super Admin",
};

/** Ordem hierárquica dos papéis, do mais baixo pro mais alto (mesma lógica do backend). */
export const HIERARQUIA_PAPEIS: Papel[] = ["user", "manager", "admin", "super_admin"];
