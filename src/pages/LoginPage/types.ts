/** O aviso acima do formulário. `ofereceRecuperacao` liga o link de
 * 'esqueci a senha' -- só faz sentido quando a falha foi de credencial. */
export interface AlertaDoLogin {
  texto: string;
  ofereceRecuperacao: boolean;
}

export interface LoginPageProps {
  /** Recado que chega junto com a tela -- hoje só "sua sessão expirou".
   * Vai DENTRO do cartão porque é sobre este login: solto acima dele
   * parecia aviso do site inteiro. */
  aviso?: string;
  onEntrar: () => void;
  onEsqueciSenha: () => void;
}
