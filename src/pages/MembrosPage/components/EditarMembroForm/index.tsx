import { Box, Input, Stack } from "@chakra-ui/react";
import { useId } from "react";

import { Botao, Campo, CampoComCadeado, Esqueleto, EstadoDeErro, LinhaDeCampos, Modal, MultiSelect, RodapeDeFormulario, Select } from "../../../../components";
import { ESCOLHA_UM_SUBGRUPO, FALHOU_AO_CONFERIR_SUBGRUPOS, HIERARQUIA_PAPEIS, NOME_PAPEL, PAPEIS_CONVIDAVEIS, TAMANHO_MAXIMO_DO_APELIDO, UFS } from "../../../../constants";
import InterruptorDaImportacao from "../../../PerfilPage/components/InterruptorDaImportacao";
import { DicaDeCampo } from "../../../../components";
import { useFormularioDeMembro } from "./useFormularioDeMembro";
import type { Papel } from "../../../../types";
import type { EditarMembroFormProps } from "./types";

export default function EditarMembroForm({
  membro, grupos, podeMoverEntreGrupos, onAtualizado, onFechar,
}: EditarMembroFormProps) {
  /** Liga o botão do rodapé ao `<form>` do corpo pelo atributo `form` --
   * eles são irmãos, não pai e filho, porque o rodapé fica fora da área que
   * rola. `useId` e não uma constante: dois modais abertos ao mesmo tempo
   * teriam o mesmo id literal, e o botão de um enviaria o formulário do
   * outro. */
  const idFormulario = useId();
  const {
    grupoProprioId,
    apelido,
    setApelido,
    grupoSelecionado,
    papelSelecionado,
    setPapelSelecionado,
    subgruposSelecionados,
    setSubgruposSelecionados,
    subgruposCarregados,
    falhouAoRecarregar,
    numeroOab,
    setNumeroOab,
    ufOab,
    setUfOab,
    importacaoLigada,
    setImportacaoLigada,
    setDestino,
    temInscricao,
    destinoEfetivo,
    mudou,
    subgruposDoGrupoQuery,
    subgruposDoGrupo,
    editavelQuery,
    salvando,
    handleMudarGrupo,
    handleSubmit,
    semSubgrupo,
  } = useFormularioDeMembro({ membro, onAtualizado, onFechar });

  return (
    <Modal
      descarte={{ mudou }}
      titulo="Editar membro"
      onFechar={onFechar}
      rodape={
        <RodapeDeFormulario salvando={salvando}>
          <Botao
            type="submit"
            form={idFormulario}
            disabled={
              salvando ||
              !subgruposCarregados ||
              semSubgrupo ||
              falhouAoRecarregar ||
              /* 🔴 A segunda metade da regra acima: enquanto não sei, também
                 não deixo salvar. Esconder os campos tira a mentira da TELA,
                 mas `numeroOab` continua `""` no estado -- e é o estado que
                 monta o PATCH. Sem esta linha, a tela em erro ainda apagaria
                 a inscrição num "Salvar" que só queria trocar o nome.

                 É `!data`, e não `isPending`: no erro a carga TERMINA sem
                 dado nenhum, e `isPending` já é `false` ali. Gêmeo do
                 `falhouAoRecarregar` logo acima, pelo motivo idêntico --
                 mandar o que não se conferiu remove o que estava lá. */
              !editavelQuery.data
            }
          >
            {salvando ? "Salvando…" : "Salvar"}
          </Botao>
        </RodapeDeFormulario>
      }
    >
      <form id={idFormulario} onSubmit={handleSubmit}>
        <Stack gap="16px">
          {/* ⚠️ O mesmo "i" do perfil, com o texto na TERCEIRA pessoa: lá é
              "sua inscrição… que ela é sua", e aqui quem edita é outro. Mesma
              correção que as cinco mensagens do servidor receberam.

              🔴 E ele importa mais aqui do que lá: o admin não sabe, ao
              digitar, que o nome dele vai ser conferido contra o tribunal --
              sem o "i", a recusa chegaria sem aviso prévio. */}
          <Campo
            rotulo="Nome completo"
            para="apelido-membro"
            aposORotulo={
              <DicaDeCampo rotulo="Por que o nome completo importa">
                <Box as="strong" color="fg" display="block" mb="6px">
                  Por que o nome completo importa
                </Box>
                Ele é o que o sistema vai comparar com o nome que o tribunal devolve
                para a inscrição na OAB desta pessoa, para confirmar que a inscrição
                é dela.
              </DicaDeCampo>
            }
          >
            <Input
              id="apelido-membro"
              value={apelido}
              onChange={(e) => setApelido(e.target.value)}
              maxLength={TAMANHO_MAXIMO_DO_APELIDO}
              autoFocus
            />
          </Campo>

          {/* O e-mail é a identidade da pessoa no sistema -- trocá-lo seria
              outra pessoa. Fica visível pra confirmar quem se está editando,
              com o cadeado dizendo por que não dá pra mexer. */}
          <Campo rotulo="E-mail" para="email-membro">
            <CampoComCadeado>
              <Input id="email-membro" value={membro.email} disabled pr="38px" />
            </CampoComCadeado>
          </Campo>

          <LinhaDeCampos>
            <Campo rotulo="Papel" para="papel-membro">
              <Select
                id="papel-membro"
                /* ⚠️ Sem `super_admin` para quem não é: o servidor recusa "papel acima do
                   seu", e oferecer a opção seria convidar para um erro. */
                opcoes={(podeMoverEntreGrupos ? HIERARQUIA_PAPEIS : PAPEIS_CONVIDAVEIS)
                  .map((p) => ({ value: p, label: NOME_PAPEL[p] }))}
                valor={papelSelecionado}
                onMudar={(v) => setPapelSelecionado(v as Papel)}
              />
            </Campo>
            <Campo rotulo="Grupo" para="grupo-membro">
              <Select
                id="grupo-membro"
                /* ⚠️ Para `admin` a lista vem VAZIA (`GET /grupos` é
                   `super_admin`-only e nem é chamada), então o próprio grupo
                   é oferecido como única opção -- um seletor vazio e travado
                   não diria onde a pessoa está. */
                opcoes={podeMoverEntreGrupos
                  ? grupos.map((g) => ({ value: g.grupo_id, label: g.nome }))
                  : [{ value: grupoProprioId, label: "Meu grupo" }]}
                valor={grupoSelecionado}
                onMudar={handleMudarGrupo}
                desabilitado={!podeMoverEntreGrupos}
              />
            </Campo>
          </LinhaDeCampos>

          <Campo
            rotulo="Subgrupos"
            para="subgrupos-membro"
            obrigatorio
            dica={ESCOLHA_UM_SUBGRUPO}
            erro={
              falhouAoRecarregar
                ? FALHOU_AO_CONFERIR_SUBGRUPOS
                : semSubgrupo
                  ? ESCOLHA_UM_SUBGRUPO
                  : undefined
            }
          >
            <MultiSelect
              id="subgrupos-membro"
              opcoes={subgruposDoGrupo.map((s) => ({ value: s.subgrupo_id, label: s.nome }))}
              selecionados={subgruposSelecionados}
              onMudar={setSubgruposSelecionados}
              placeholder="Selecione os subgrupos"
              /* Duas esperas, e as duas enganam: as OPÇÕES vêm da consulta,
                 e a SELEÇÃO atual vem do `listarTodosOsMembrosDoGrupo` de cima.
                 Sem as duas o seletor aparecia vazio, como se a pessoa não
                 estivesse em subgrupo nenhum -- e o Salvar travado sem
                 dizer por quê. */
              carregando={subgruposDoGrupoQuery.isPending || !subgruposCarregados}
            />
          </Campo>

          {/* 🔴 A inscrição da OAB desta pessoa, editável por `admin`+: a
              titularidade é conferida também quando só o NOME muda, e sem
              estes campos o admin travaria ao corrigir um nome, sem como
              limpar a OAB de outro. */}
          {/* ⚠️ **Sem divisória, e sem espaçamento próprio.** O `Stack` do
              formulário já dá `gap="16px"` entre todas as linhas; uma régua
              aqui faria ESTA fronteira parecer mais importante que as
              outras, e acabou lida como sublinhado do bloco de cima. */}
          {/* 🔴 **Enquanto não sei, não afirmo.** Estes campos não podem
              nascer vazios à espera da resposta, e a razão é a mesma do
              seletor de subgrupos acima -- vazio aqui não se lê como
              "carregando", se lê como "esta pessoa não tem OAB".

              Só que aqui a mentira também GRAVA: `""` nas duas partes é o
              gesto de APAGAR a inscrição (ver `types/requisicoes.ts`), então
              um admin que abrisse o modal para corrigir um NOME e salvasse
              antes da resposta chegar apagaria a OAB de quem tem, junto com
              a importação automática. Medido em 02/09/2026: o PATCH saía com
              `numero_oab: ""`, e o servidor obedecia -- corretamente.

              Também é o que fecha a corrida: sem campo na tela, não há texto
              digitado para a resposta sobrescrever quando ela chega. */}
          {editavelQuery.isPending ? (
            <Esqueleto linhas={2} />
          ) : editavelQuery.isError ? (
            <EstadoDeErro
              mensagem="Não foi possível carregar a inscrição desta pessoa."
              onTentarDeNovo={() => editavelQuery.refetch()}
              tentando={editavelQuery.isFetching}
            />
          ) : (
            <>
              <LinhaDeCampos>
                <Campo rotulo="Número da OAB" para="numero-oab-membro">
                  <Input
                    id="numero-oab-membro"
                    value={numeroOab}
                    onChange={(e) => setNumeroOab(e.target.value)}
                    inputMode="numeric"
                    placeholder="Só os dígitos"
                  />
                </Campo>
                <Campo rotulo="UF" para="uf-oab-membro">
                  <Select
                    id="uf-oab-membro"
                    /* 🔴 A opção vazia é EXPLÍCITA, como no perfil: é o vazio
                       nas DUAS partes que apaga a inscrição, e sem ela quem
                       escolhesse uma UF nunca mais voltaria ao vazio. */
                    opcoes={[{ value: "", label: "Nenhuma" },
                             ...UFS.map((uf) => ({ value: uf, label: uf }))]}
                    valor={ufOab}
                    onMudar={setUfOab}
                    largura="120px"
                  />
                </Campo>
              </LinhaDeCampos>

              <InterruptorDaImportacao
                ligada={importacaoLigada}
                aoMudarLigada={setImportacaoLigada}
                /* 🔴 Os subgrupos MARCADOS AGORA, não os salvos: é a mesma tela
                   que os edita, e o servidor valida contra este PATCH. Assim não
                   dá para escolher um destino que o salvamento invalidaria. */
                subgrupos={subgruposDoGrupo
                  .filter((s) => subgruposSelecionados.includes(s.subgrupo_id))
                  .map((s) => ({ id: s.subgrupo_id, nome: s.nome }))}
                destino={destinoEfetivo}
                aoMudarDestino={setDestino}
                temInscricao={temInscricao}
                desabilitado={salvando}
                deTerceiro
                compacto
              />
            </>
          )}
        </Stack>
      </form>
    </Modal>
  );
}
