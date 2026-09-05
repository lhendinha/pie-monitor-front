import type { ButtonProps } from "@chakra-ui/react";
import type { ReactNode } from "react";
import type { VarianteBotao } from "../../types";

export interface BotaoProps extends Omit<ButtonProps, "variant"> {
  variante?: VarianteBotao;
  children: ReactNode;
}
