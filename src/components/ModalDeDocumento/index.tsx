import { Input, Stack, Textarea } from "@chakra-ui/react";
import { useId } from "react";

/* Irmãos importados um a um, e não pelo índice de `components`: este
   componente É exportado por aquele índice, e importar dele criaria um ciclo
   -- mesmo padrão do `ModalDeTarefa`. */
import Botao from "../Botao";
import RodapeDeFormulario from "../RodapeDeFormulario";
import Campo from "../Campo";
import CampoDeArquivo from "../CampoDeArquivo";
import CampoDeClientes from "../CampoDeClientes";
import LinhaDeCampos from "../LinhaDeCampos";
import Modal from "../Modal";
import { Select } from "../Select";
import VinculoDeRegistro from "../VinculoDeRegistro";
import {
  TAMANHO_MAXIMO_DA_DESCRICAO_DE_DOCUMENTO,
  TAMANHO_MAXIMO_DA_URL_DE_DOCUMENTO,
  TAMANHO_MAXIMO_DO_TITULO_DE_DOCUMENTO,
  TIPOS_DE_DOCUMENTO,
} from "../../constants";
import { useFormularioDeDocumento } from "./useFormularioDeDocumento";
import type { ModalDeDocumentoProps } from "./types";

/** Adicionar documento: arquivo enviado ou link.
 *
 * 🔴 **Só CRIA.** Editar e excluir vivem na tela do documento, como em
 * Processos e Clientes -- clicar na linha abre a tela, e é lá que se mexe.
 * Um modal que também edita traria duas telas para a mesma coisa, e é o
 * caminho que o sistema já não segue.
 *
 * 🔴 **O arquivo não passa pela API.** São três passos: pedir a permissão de
 * gravar, enviar direto ao armazenamento, e só então criar o registro. O teto
 * de payload de um Lambda é 6 MB, e um documento pode ter 20.
 *
 * ⚠️ **Nada é gravado antes de o arquivo chegar**, e isso apaga um estado
 * inteiro: sem "envio incompleto" na lista, sem botão de reenviar, sem rota
 * de confirmar. O envio acontece com o modal aberto -- falhou, o erro aparece
 * aqui e a pessoa tenta de novo com tudo ainda digitado.
 */
export default function ModalDeDocumento({
  subgrupoInicial,
  vinculosIniciais,
  clientesIniciais,
  onSalvo,
  onFechar,
}: ModalDeDocumentoProps) {
  const prefixo = useId();
  const {
    tipo,
    setTipo,
    titulo,
    setTitulo,
    descricao,
    setDescricao,
    arquivo,
    setArquivo,
    url,
    setUrl,
    subgrupoEscolhido,
    subgrupos,
    trocarSubgrupo,
    vinculos,
    setVinculos,
    clientes,
    setClientes,
    nomesDosClientes,
    setNomesDosClientes,
    responsavel,
    setResponsavel,
    membros,
    carregandoMembros,
    ehArquivo,
    faltaAlgo,
    mudou,
    salvando,
    handleSubmit,
  } = useFormularioDeDocumento({ subgrupoInicial, vinculosIniciais, clientesIniciais, onSalvo, onFechar });

  return (
    <Modal
      descarte={{ mudou, caso: "criacao" }}
      titulo="Adicionar documento"
      onFechar={onFechar}
      rodape={
        <RodapeDeFormulario salvando={salvando}>
          <Botao type="submit" form={`${prefixo}-form`} disabled={faltaAlgo || salvando}>
            {/* "Enviando…" e não "Salvando…" quando há arquivo: a espera é o
                upload, e ela é sensivelmente mais longa que a de um
                formulário comum. */}
            {salvando ? (ehArquivo ? "Enviando…" : "Salvando…") : "Salvar"}
          </Botao>
        </RodapeDeFormulario>
      }
    >
      <Stack as="form" id={`${prefixo}-form`} onSubmit={handleSubmit} gap="0">
        <LinhaDeCampos>
          <Campo rotulo="Tipo" para={`${prefixo}-tipo`} obrigatorio>
            <Select
              id={`${prefixo}-tipo`}
              opcoes={TIPOS_DE_DOCUMENTO.map((t) => ({ value: t.id, label: t.rotulo }))}
              valor={tipo}
              onMudar={setTipo}
            />
          </Campo>
          <Campo
            rotulo="Subgrupo"
            para={`${prefixo}-subgrupo`}
            obrigatorio
            /* Diz o que o campo DECIDE. Sem isto ele parece classificação, e
               é permissão: é o subgrupo que define quem vê o documento. */
            dica="Quem participa dele enxerga este documento."
          >
            <Select
              id={`${prefixo}-subgrupo`}
              opcoes={subgrupos.opcoes}
              valor={subgrupoEscolhido}
              onMudar={trocarSubgrupo}
              carregando={subgrupos.carregandoPrimeiraVez}
              onBuscar={subgrupos.buscar}
              erro={subgrupos.erro}
              onTentarDeNovo={subgrupos.tentarDeNovo}
            />
          </Campo>
        </LinhaDeCampos>

        {ehArquivo ? (
          <Campo rotulo="Arquivo" para={`${prefixo}-arquivo`} obrigatorio>
            <CampoDeArquivo
              id={`${prefixo}-arquivo`}
              valor={arquivo}
              desabilitado={salvando}
              onMudar={(escolhido) => {
                setArquivo(escolhido);
                /* O nome do arquivo vira o título, se ainda não há um. É o
                   que a pessoa escreveria de qualquer jeito -- e continua
                   editável, aqui e depois. */
                if (escolhido && !titulo.trim()) setTitulo(escolhido.name);
              }}
            />
          </Campo>
        ) : (
          <Campo rotulo="Endereço" para={`${prefixo}-url`} obrigatorio>
            <Input
              id={`${prefixo}-url`}
              type="url"
              placeholder="https://"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              maxLength={TAMANHO_MAXIMO_DA_URL_DE_DOCUMENTO}
            />
          </Campo>
        )}

        <Campo
          rotulo="Título"
          para={`${prefixo}-titulo`}
          obrigatorio
          /* ⚠️ Explica a separação entre título e nome do arquivo ANTES de
             ela surpreender: quem renomeia o título esperando renomear o
             arquivo baixado só descobriria meses depois, ao baixar. */
          dica={
            ehArquivo
              ? "É como o documento aparece na lista. O arquivo continua baixando com o nome original."
              : undefined
          }
        >
          <Input
            id={`${prefixo}-titulo`}
            placeholder="Petição inicial, procuração, contrato…"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            maxLength={TAMANHO_MAXIMO_DO_TITULO_DE_DOCUMENTO}
          />
        </Campo>

        <Campo rotulo="Descrição" para={`${prefixo}-descricao`}>
          <Textarea
            id={`${prefixo}-descricao`}
            placeholder="O que é este documento, e por que ele está aqui"
            rows={2}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            maxLength={TAMANHO_MAXIMO_DA_DESCRICAO_DE_DOCUMENTO}
          />
        </Campo>

        <Campo
          rotulo="Processo ou atendimento vinculado"
          para={`${prefixo}-vinculo`}
          dica="Opcional. Dá pra vincular um processo, um atendimento, ou os dois."
        >
          <VinculoDeRegistro
            id={`${prefixo}-vinculo`}
            valor={vinculos}
            onMudar={setVinculos}
          />
        </Campo>

        <Campo rotulo="Clientes" para={`${prefixo}-clientes`}>
          <CampoDeClientes
            id={`${prefixo}-clientes`}
            valor={clientes}
            nomes={nomesDosClientes}
            onMudar={(ids, nomes) => {
              setClientes(ids);
              setNomesDosClientes(nomes);
            }}
          />
        </Campo>

        <Campo rotulo="Responsável" para={`${prefixo}-responsavel`}>
          <Select
            id={`${prefixo}-responsavel`}
            opcoes={[
              { value: "", label: "Sem responsável" },
              ...membros.map((m) => ({ value: m.email, label: m.apelido || m.email })),
            ]}
            valor={responsavel}
            onMudar={setResponsavel}
            carregando={carregandoMembros}
          />
        </Campo>
      </Stack>
    </Modal>
  );
}
