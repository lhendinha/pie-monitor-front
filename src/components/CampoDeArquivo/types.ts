export interface CampoDeArquivoProps {
  id: string;
  /** O escolhido, ou `null`. Quem guarda é quem usa -- o campo não tem
   * estado próprio do arquivo, só do arrasto. */
  valor: File | null;
  onMudar: (arquivo: File | null) => void;
  /** Trava tudo enquanto o envio está em voo: trocar o arquivo no meio
   * deixaria a tela mostrando um nome e o servidor recebendo outro. */
  desabilitado?: boolean;
}
