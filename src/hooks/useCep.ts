import { useRef, useState } from "react";

import { DIGITOS_DO_CEP } from "../constants";
import { consultarCep } from "../services";
import { apenasDigitos } from "../utils";
import type { EnderecoDoCep, EstadoDoCep } from "../types";

interface UseCepOpcoes {
  /** Chamado com o endereço quando a consulta acha algo. */
  aoPreencher: (achado: EnderecoDoCep) => void;
}

/**
 * Consulta o CEP quando ele fica completo e devolve o endereço.
 *
 * 🔴 SEM debounce, e de propósito. A guarda é o TAMANHO: só consulta com 8
 * dígitos. Quem digita "30130010" passa por sete valores incompletos, e
 * todos os sete têm menos de 8 dígitos -- esta guarda os elimina sozinha,
 * sem timer nenhum. Um debounce não evitaria consulta alguma; só atrasaria
 * em 300ms a única que importa.
 *
 * ⚠️ E `ESPERA_DA_BUSCA_MS` diz de si que é dos CAMPOS DE BUSCA (Clientes,
 * Processos, vínculo de tarefa), compartilhada pra que a mesma ação não
 * pareça mais lenta numa tela que na outra. CEP não é busca por texto: é
 * campo de tamanho fixo, que se sabe completo.
 */
export function useCep({ aoPreencher }: UseCepOpcoes) {
  const [estado, setEstado] = useState<EstadoDoCep>({ buscando: false });

  /** O último CEP consultado COM SUCESSO.
   *
   * 🔴 Sem isto, apagar um dígito e redigitá-lo consultaria de novo o mesmo
   * CEP -- e sobrescreveria o que a pessoa já tivesse corrigido à mão no
   * logradouro. Consultar é para quando o CEP MUDA.
   *
   * 🔴 E é esquecido quando a consulta FALHA, senão a mensagem "tente de
   * novo" seria mentira: com a memória intacta, redigitar o mesmo CEP não
   * dispararia nada, e a pessoa não teria como tentar. */
  const ultimoConsultado = useRef("");

  /** A consulta mais recente. Uma resposta lenta de um CEP antigo chegando
   * depois de uma nova consulta preencheria o formulário com o endereço
   * errado -- o clássico da corrida entre respostas. */
  const consultaAtual = useRef(0);

  async function aoMudarCep(valor: string) {
    const digitos = apenasDigitos(valor);

    if (digitos.length < DIGITOS_DO_CEP) {
      /* ⚠️ A memória NÃO é limpa aqui. Limpá-la fazia apagar um dígito e
         redigitar o mesmo consultar de novo -- e sobrescrever o que a
         pessoa tivesse corrigido à mão. Quem libera a próxima consulta é o
         CEP ser diferente, ou a anterior ter falhado. */
      setEstado({ buscando: false });
      return;
    }
    if (digitos === ultimoConsultado.current) return;

    ultimoConsultado.current = digitos;
    const minhaVez = ++consultaAtual.current;
    setEstado({ buscando: true });

    try {
      const achado = await consultarCep(digitos);
      if (minhaVez !== consultaAtual.current) return;
      setEstado({ buscando: false });
      aoPreencher(achado);
    } catch (erro) {
      if (minhaVez !== consultaAtual.current) return;
      // Esquece, pra que redigitar o mesmo CEP tente de novo -- é o que a
      // mensagem abaixo promete.
      ultimoConsultado.current = "";
      /* Os dois desfechos dizem coisas DIFERENTES, e trocá-los desorienta:
         "não encontrado" é caminho normal e a saída é digitar; serviço fora
         é transitório e vale tentar de novo. */
      const status = (erro as { status?: number })?.status;
      setEstado({
        buscando: false,
        aviso:
          status === 404
            ? "CEP não encontrado. Preencha o endereço à mão."
            : "Não foi possível consultar o CEP agora. Tente de novo ou preencha à mão.",
      });
    }
  }

  return { estado, aoMudarCep };
}
