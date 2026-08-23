/** O aviso acima do formulário. `ofereceRecuperacao` liga o link de
 * 'esqueci a senha' -- só faz sentido quando a falha foi de credencial. */
export interface AlertaDoLogin {
  texto: string;
  ofereceRecuperacao: boolean;
}
