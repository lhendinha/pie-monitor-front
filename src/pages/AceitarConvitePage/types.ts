export interface AceitarConvitePageProps {
  token: string;
  /** Chamado quando a conta é criada e os tokens já estão salvos. Quem
   * navega é a rota -- a página segue pura, como a de login. */
  onEntrar: () => void;
}
