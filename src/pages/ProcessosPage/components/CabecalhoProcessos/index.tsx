import { Box, Button, Flex, Heading, Text, Wrap } from "@chakra-ui/react";

import { CampoDeBusca, MultiSelect, Select } from "../../../../components";
import FiltroDatas from "../FiltroDatas";
import { contar } from "../../../../utils";
import type { Cliente, FiltrosProcessos, OpcaoProcesso } from "../../../../types";

interface Props {
  carregando: boolean;
  /** As listas dos CHIPS (clientes, fases, situações), que não são a mesma
   * espera do `carregando` acima -- aquele é a lista de processos. Sem
   * distinguir, os filtros abriam vazios afirmando que não há nenhuma
   * situação cadastrada. */
  carregandoCatalogos?: boolean;
  /** A tabela ainda não reflete o que está escrito na busca. */
  buscando?: boolean;
  total: number;
  /** Total do grupo, ignorando filtros -- é o "de Y" da contagem. Sem ele a
   * frase não diz de quanto o resultado foi recortado. */
  totalSemFiltro: number;
  busca: string;
  onBuscar: (valor: string) => void;
  filtros: FiltrosProcessos;
  onMudarFiltro: (parcial: Partial<FiltrosProcessos>) => void;
  clientes: Cliente[];
  fases: OpcaoProcesso[];
  situacoes: OpcaoProcesso[];
  onNovoProcesso: () => void;
}

/** Cabeçalho da tela de Processos: título, ação, filtros e contagem.
 *
 * Os filtros são **chips inline**, como no artifact -- não um painel que
 * abre. Cada chip mostra no próprio rótulo o que está selecionado, e é por
 * isso que não existe uma fileira de chips removíveis embaixo: o estado do
 * filtro mora no controle que o define, em vez de em dois lugares que podem
 * discordar.
 */
export default function CabecalhoProcessos({
  carregando,
  carregandoCatalogos,
  buscando,
  total,
  totalSemFiltro,
  busca,
  onBuscar,
  filtros,
  onMudarFiltro,
  clientes,
  fases,
  situacoes,
  onNovoProcesso,
}: Props) {
  return (
    <Box mb="14px">
      <Flex align="flex-start" justify="space-between" gap="16px" mb="18px">
        <Box>
          {/* 23px / -0.01em / 13px: medidos no artifact, não estimados. */}
          <Heading as="h1" fontSize="23px" fontWeight="800" letterSpacing="-0.01em">
            Processos
          </Heading>
          <Text fontSize="13px" color="fg.muted" mt="2px">
            Monitoramento automático de movimentações
          </Text>
        </Box>
        <Button
          bg="fg.brand"
          color="white"
          fontWeight="700"
          px="18px"
          flexShrink={0}
          _hover={{ bg: "brand.dark" }}
          onClick={onNovoProcesso}
        >
          + Novo processo
        </Button>
      </Flex>

      <Wrap gap="10px" mb="10px">
        {/* Situação e fase aceitam VÁRIOS valores (é o que o artifact faz,
            e o backend passou a suportar em 21/08). Cliente é valor único --
            no artifact o painel dele usa botões, não caixas. */}
        <MultiSelect
          variante="chip"
          placeholder="Todas as situações"
          opcoes={situacoes.map((s) => ({ value: s.opcao_id, label: s.rotulo }))}
          selecionados={filtros.situacaoIds}
          onMudar={(v) => onMudarFiltro({ situacaoIds: v })}
          carregando={carregandoCatalogos}
        />
        <MultiSelect
          variante="chip"
          placeholder="Todas as fases"
          opcoes={fases.map((f) => ({ value: f.opcao_id, label: f.rotulo }))}
          selecionados={filtros.faseIds}
          onMudar={(v) => onMudarFiltro({ faseIds: v })}
          carregando={carregandoCatalogos}
        />
        <Select
          variante="chip"
          placeholder="Todos os clientes"
          opcoes={clientes.map((c) => ({ value: c.cliente_id, label: c.nome }))}
          valor={filtros.clienteId}
          onMudar={(v) => onMudarFiltro({ clienteId: v })}
          carregando={carregandoCatalogos}
        />
        <FiltroDatas
          dataVerificarAte={filtros.dataVerificarAte}
          prazoFinalAte={filtros.prazoFinalAte}
          onMudar={onMudarFiltro}
        />
        {/* `flex` + `minW` mantêm o campo utilizável quando os chips
            quebram pra segunda linha em tela estreita. */}
        <CampoDeBusca
          rotulo="Pesquisar processo por número, cliente ou apelido"
          placeholder="Pesquisar número, cliente ou apelido"
          valor={busca}
          onMudar={onBuscar}
          larguraMaxima="420px"
          buscando={buscando}
        />
      </Wrap>

      {/* Contagem embaixo dos filtros, como no artifact: ela descreve o
          RESULTADO do que os chips acima definiram. */}
      {/* Some enquanto carrega, em vez de dizer "carregando…": o esqueleto
          logo abaixo já é o recado, e duas mensagens da mesma espera na
          mesma tela é ruído. Mantém a linha ocupando o espaço pra a
          contagem não empurrar a tabela ao chegar. */}
      <Text fontSize="11.5px" color="fg.subtle" className="num" minH="17px">
        {carregando
          ? ""
          : `Mostrando ${total} de ${contar(totalSemFiltro, "processo", "processos")}`}
      </Text>
    </Box>
  );
}
