import { ApiError } from "../../services";
import { contar } from "../../utils";

interface Aviso {
  /** O que deu errado. Continua sendo a mensagem principal. */
  erro: string;
  /** O recado sobre o bloqueio, secundário ao erro -- ou vazio, quando
   * ainda está longe do limite. */
  alerta?: string;
  /** No 429 a saída real é redefinir a senha, que destrava o login na hora.
   * Oferecer o link ali mesmo evita a espera de 15 minutos. */
  ofereceRecuperacao?: boolean;
}

/** Traduz a recusa do login no que a tela mostra.
 *
 * O servidor só manda o contador nas TRÊS ÚLTIMAS tentativas -- quem errou
 * a digitação uma vez não precisa ver contagem regressiva, e alarmar cedo é
 * ruído. Quando os campos não vêm, a mensagem é a de sempre.
 *
 * ⚠️ Nada aqui diz se o e-mail existe. O texto é o mesmo pra conta real e
 * inexistente, e o servidor garante isso -- o contador sobe igual nos dois
 * casos. Uma mensagem diferente entregaria quem tem conta aqui a quem
 * estiver testando endereços.
 */
export function avisoDeTentativas(err: unknown): Aviso {
  const generico = "E-mail ou senha incorretos.";
  // 🔴 Falha de REDE não é credencial errada.
  //
  // Tudo que não fosse `ApiError` caía na mensagem genérica -- inclusive
  // Wi-Fi caído e 502 do gateway. A pessoa digitava a senha CERTA, a tela
  // afirmava que estava errada, e ela ia redefinir uma senha que estava
  // perfeita. Não revelar se o e-mail existe não exige confundir "não
  // consegui falar com o servidor" com "credencial recusada".
  if (!(err instanceof ApiError)) {
    return { erro: "Não foi possível falar com o servidor. Verifique sua conexão." };
  }

  if (err.status === 429) {
    const segundos = Number(err.corpo.retry_after_segundos) || 0;
    const minutos = Math.max(1, Math.ceil(segundos / 60));
    return {
      erro: `Muitas tentativas. Tente de novo em ${contar(minutos, "minuto", "minutos")}.`,
      ofereceRecuperacao: true,
    };
  }

  const restantes = err.corpo.tentativas_restantes;
  if (typeof restantes !== "number") return { erro: generico };

  const bloqueio = Number(err.corpo.bloqueio_minutos) || 0;
  const porQuanto = bloqueio ? ` por ${contar(bloqueio, "minuto", "minutos")}` : "";

  if (restantes <= 0) {
    return {
      erro: generico,
      alerta: `A próxima tentativa será recusada: o acesso fica bloqueado${porQuanto}.`,
      ofereceRecuperacao: true,
    };
  }

  return {
    erro: generico,
    // "resta 1 tentativa", nunca "1 tentativa(s)" -- parêntese de plural é
    // gíria de programador vazando pra interface.
    alerta:
      restantes === 1
        ? `Resta 1 tentativa antes de o acesso ser bloqueado${porQuanto}.`
        : `Restam ${restantes} tentativas antes de o acesso ser bloqueado${porQuanto}.`,
  };
}
