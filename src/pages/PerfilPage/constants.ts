/** Abas do perfil.
 *
 * 🔴 Duas desde 30/08/2026, e a divisão é por ASSUNTO: quem eu sou e como
 * entro numa; o que o sistema vigia por mim na outra. Cada uma tem o próprio
 * "Salvar".
 *
 * ⚠️ E isso torna ESTRUTURAL o que antes era lógica: com um formulário só, o
 * PATCH tinha de escolher o que mandar (o servidor trata campo ausente como
 * "não mexer", e mandar o nome numa troca de OAB o reescreveria). Separadas,
 * cada aba só conhece os próprios campos -- não há como mandar o do vizinho.
 *
 * ⚠️ A primeira NÃO se chama "Perfil": a página já se chama "Meu perfil", e
 * uma aba com o mesmo nome logo abaixo do título não informa nada.
 *
 * A aba mora em estado LOCAL, não na URL -- ver `utils/abas`: telas de gestão
 * são alcançadas pelo menu, e só as de DETALHE precisam sobreviver ao F5. */
export const ABAS_DO_PERFIL = [
  { id: "dados", rotulo: "Meus dados" },
  { id: "inscricao", rotulo: "Inscrição na OAB" },
] as const;
