import type { InscricaoAvulsa } from "../../../../types";

/** Quem o modal está editando. `"nova"` é o cadastro; ausente, ele está
 * fechado.
 *
 * ⚠️ Um estado só, e não um par de booleanos "está aberto" / "está editando":
 * dois deles deixariam representável "fechado, editando a 263/MG", que não
 * quer dizer nada -- e alguém teria de lembrar de zerar os dois juntos. */
export type NoModal = InscricaoAvulsa | "nova" | null;
