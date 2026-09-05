/** Cliente e endereço. */

export interface Cliente {
  grupo_id: string;
  cliente_id: string;
  nome: string;
  criado_por?: string;
  criado_em?: string;
  cpf_cnpj?: string | null;
  /** Quantos processos do grupo referenciam este cliente. Campo DERIVADO,
   * calculado pela API (22/08/2026) -- não está gravado no cliente. Conta
   * a linha de processo, então o mesmo número em dois subgrupos conta
   * duas vezes. */
  processos?: number;
  telefone?: string | null;
  email?: string | null;
  /** Endereço -- opcional inteiro, e PLANO como na API (um objeto aninhado
   * exigiria uma segunda semântica de PATCH). Ausente em cliente cadastrado
   * antes de 27/08/2026, e quem lê trata `null`/`undefined` como "não
   * informado". */
  cep?: string | null;
  logradouro?: string | null;
  /** TEXTO, nunca número: "S/N", "123-A" e "km 12" são endereços reais. */
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
}

/** O endereço como o formulário o carrega -- sempre string, nunca `null`.
 *
 * ⚠️ Separado do `Cliente` de propósito: lá os campos são opcionais porque
 * a API pode não mandá-los; aqui são obrigatórios porque um `<input>`
 * controlado com `value={undefined}` vira NÃO-controlado, e o React só
 * avisa disso no console. */
export interface EnderecoDoCliente {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
}

/** O que a rota `GET /cep/{cep}` devolve -- já traduzido pela nossa API, sem
 * o formato de provedor nenhum. */
export interface EnderecoDoCep {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
}

/** O que `POST`/`PATCH /clientes` recebe. Em camelCase porque é o que a tela
 * monta; quem traduz pros nomes da API é o serviço. */
export interface CamposCliente {
  nome: string;
  cpfCnpj?: string;
  telefone?: string;
  email?: string;
  /** Opcional inteiro -- cliente sem endereço é válido. */
  endereco?: EnderecoDoCliente;
}

/** Os parâmetros de `GET /clientes`.
 *
 * ⚠️ `busca` IGNORA `pagina`/`tamanhoPagina`: é uma consulta pontual, não
 * paginada -- mesmo corte que `clientes_router.py` usa do outro lado. */
export interface OpcoesListarClientes {
  pagina?: number;
  tamanhoPagina?: number;
  busca?: string;
}

/** O andamento da consulta de CEP, como a tela precisa vê-lo. */
export interface EstadoDoCep {
  buscando: boolean;
  /** Mensagem pra mostrar embaixo do campo, ou `undefined`. Distingue "não
   * encontrado" de "o serviço caiu": a primeira manda preencher à mão, a
   * segunda manda tentar de novo. */
  aviso?: string;
}

/** Qualquer coisa que carregue ids de cliente -- processo ou atendimento.
 * Mesmo motivo do `ComOrdem`: o helper que resolve nomes só precisa dos
 * ids. */
export interface ComClientes {
  cliente_ids?: string[];
  /** Nome de cada cliente, NA MESMA ORDEM de `cliente_ids` -- campo derivado
   * que o servidor resolve pra página pedida. Ver `Atendimento`. */
  cliente_nomes?: string[];
}
