import { Box } from "@chakra-ui/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Abas,
  BotaoDeTexto,
  CabecalhoDePagina,
  Cartao,
  IconeSeta,
  PainelDaAba,
} from "../../components";
import FormularioDaInscricao from "./components/FormularioDaInscricao";
import FormularioDeDados from "./components/FormularioDeDados";
import ModalDeSenha from "./components/ModalDeSenha";
import { ABAS_DO_PERFIL } from "./constants";
import type { AbaDoPerfil } from "../../types";

/** Meu perfil.
 *
 * Chega pelo menu do usuário na topbar, e não pelo menu lateral -- é sobre a
 * conta de quem está usando, não sobre o trabalho. Daí o "Voltar", que a
 * navegação lateral não oferece.
 *
 * 🔴 **Duas abas**, divididas por ASSUNTO: quem eu sou e como
 * entro numa; o que o sistema vigia por mim na outra. Cada uma tem o próprio
 * "Salvar", num cartão só -- e é isso que torna ESTRUTURAL a garantia de PATCH
 * parcial: uma aba não conhece os campos da outra, então não há como
 * sobrescrevê-los por engano.
 *
 * ⚠️ O cartão não tem título: quem nomeia a área é a ABA logo acima dele.
 * Repetir o nome nos dois seria eco.
 */
export default function PerfilPage() {
  const navegar = useNavigate();
  const [trocandoSenha, setTrocandoSenha] = useState(false);
  const [aba, setAba] = useState<AbaDoPerfil>("dados");

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
        grupo="perfil"
        abas={ABAS_DO_PERFIL.map((a) => ({ id: a.id, rotulo: a.rotulo }))}
        ativa={aba}
        onMudar={(id) => setAba(id as AbaDoPerfil)}
      />

      <Box maxW="660px">
        <PainelDaAba grupo="perfil" id="dados" ativa={aba}>
          <Cartao>
            <FormularioDeDados onAlterarSenha={() => setTrocandoSenha(true)} />
          </Cartao>
        </PainelDaAba>

        <PainelDaAba grupo="perfil" id="inscricao" ativa={aba}>
          <Cartao>
            <FormularioDaInscricao />
          </Cartao>
        </PainelDaAba>
      </Box>

      {trocandoSenha && <ModalDeSenha onFechar={() => setTrocandoSenha(false)} />}
    </Box>
  );
}
