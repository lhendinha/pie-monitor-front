import type { SubgrupoDoPerfil } from "../../../../types";

export interface InterruptorDaImportacaoProps {
  ligada: boolean;
  aoMudarLigada: (ligada: boolean) => void;
  /** Os subgrupos de que a pessoa participa -- já filtrados pelo servidor. */
  subgrupos: SubgrupoDoPerfil[];
  destino: string;
  aoMudarDestino: (subgrupoId: string) => void;
  /** A inscrição válida existe no formulário (salva ou recém-digitada).
   *
   * 🔴 Olha o CAMPO, não o que está salvo: cadastrar a OAB e ligar no mesmo
   * "Salvar" é um caminho que o servidor aceita, e travar o interruptor até
   * a inscrição estar gravada obrigaria a salvar duas vezes sem motivo. */
  temInscricao: boolean;
  desabilitado?: boolean;
  /** O registro é de OUTRA pessoa (modal de membro), não de quem está olhando.
   *
   * 🔴 Muda as palavras, não a regra: "sua inscrição" está certo no perfil e
   * errado quando um `admin` edita o registro de um colega. É a mesma
   * correção que as cinco mensagens do servidor receberam. */
  deTerceiro?: boolean;
  /** Encosta a divisória no espaçamento que o PAI já dá.
   *
   * 🔴 **A régua fica nos dois casos** -- ela separa a inscrição do que o
   * sistema faz com ela, e isso vale em qualquer tela. O que muda é o
   * RESPIRO: no perfil o componente precisa criar o dele (`mt`); no modal o
   * `Stack` já dá `gap="16px"` entre as linhas, e somar `mt` em cima disso
   * abriu um vão que destoava de todas as outras fronteiras do formulário.
   *
   * ⚠️ Prop, e não `deTerceiro` fazendo dois trabalhos: espaçamento é do
   * contexto, não de quem é o dono do registro. */
  compacto?: boolean;
}
