import { Box } from "@chakra-ui/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Abas, BotaoDeTexto, CabecalhoDePagina, Cartao, IconeSeta } from "../../components";
import FormularioIdentificacao from "./components/FormularioIdentificacao";
import ModalDeSenha from "./components/ModalDeSenha";
import { ABAS_DO_PERFIL } from "./constants";

/** Meu perfil.
 *
 * Chega pelo menu do usuário na topbar, e não pelo menu lateral -- é sobre
 * a conta de quem está usando, não sobre o trabalho. Daí o "Voltar", que a
 * navegação lateral não oferece.
 *
 * O cartão não tem título: quem nomeia os blocos aqui dentro são os rótulos
 * de seção ("Informações pessoais", "Conta"), como no artifact.
 */
export default function PerfilPage() {
  const navegar = useNavigate();
  const [trocandoSenha, setTrocandoSenha] = useState(false);

  return (
    <Box>
      <Box mb="14px">
        <BotaoDeTexto onClick={() => navegar(-1)}>
          <IconeSeta />
          Voltar
        </BotaoDeTexto>
      </Box>

      <CabecalhoDePagina titulo="Meu perfil" subtitulo="Identificação e segurança da sua conta." />

      <Abas
        abas={ABAS_DO_PERFIL.map((a) => ({ id: a.id, rotulo: a.rotulo }))}
        ativa="identificacao"
        onMudar={() => {}}
      />

      <Box maxW="660px">
        <Cartao>
          <FormularioIdentificacao onAlterarSenha={() => setTrocandoSenha(true)} />
        </Cartao>
      </Box>

      {trocandoSenha && <ModalDeSenha onFechar={() => setTrocandoSenha(false)} />}
    </Box>
  );
}
