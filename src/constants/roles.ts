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

/** Papéis que dá pra atribuir num convite.
 *
 * `super_admin` fica de fora de propósito: quem já é super admin promove
 * alguém pela tela de Membros, e um convite que cria super admin direto é
 * uma escalada de privilégio à espera de um e-mail digitado errado. */
export const PAPEIS_CONVIDAVEIS: Papel[] = ["user", "manager", "admin"];

/** Com o que o formulário de convite nasce, e pro que ele VOLTA depois de
 * enviar. `PAPEIS_CONVIDAVEIS` inclui `admin`, então deixar o papel do
 * convite anterior no seletor era jeito fácil de promover alguém sem
 * querer. */
export const PAPEL_PADRAO_DO_CONVITE: Papel = "user";
