import { Box } from "@chakra-ui/react";

import { idDaAba, idDoPainel } from "../../utils/abas";
import type { PainelDaAbaProps } from "./types";

/** O conteúdo de uma aba.
 *
 * ⚠️ Esconde com `display: none`, NUNCA com `opacity` ou `visibility`. Só o
 * `display` tira o conteúdo do fluxo de foco; com os outros, o Tab caminha
 * para dentro dos campos da aba invisível e o cursor some da tela.
 *
 * 🔴 **Quem decide montar ou não é quem chama**, e as duas escolhas existem
 * no projeto:
 *
 * - nas telas de DETALHE (processo, cliente) os filhos vão sempre, e o
 *   painel só esconde. A aba "Detalhes" delas é um FORMULÁRIO com estado
 *   local (`apelido`, `nome`, `telefone`...): desmontar ao trocar de aba
 *   jogaria fora o que a pessoa acabou de digitar, sem aviso. Não custa
 *   consulta -- os dados das abas já vêm juntos;
 * - em `GrupoPage`, cada aba é uma página inteira com consultas próprias, e
 *   os filhos são condicionais. Montar as seis de uma vez dispararia todas
 *   juntas. O painel continua existindo, vazio, pra o `aria-controls` da
 *   aba ter onde apontar.
 */
export default function PainelDaAba({ grupo, id, ativa, children }: PainelDaAbaProps) {
  return (
    <Box
      role="tabpanel"
      id={idDoPainel(grupo, id)}
      aria-labelledby={idDaAba(grupo, id)}
      display={id === ativa ? "block" : "none"}
    >
      {children}
    </Box>
  );
}
