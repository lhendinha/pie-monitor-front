import { BrowserRouter } from "react-router-dom";

import { ToastProvider } from "./contexts/ToastContext";
import { SessaoProvider } from "./contexts/SessaoContext";
import Rotas from "./routes";

/** Só os provedores, na ordem em que precisam existir.
 *
 * O mapa de rotas mora em `routes/index.tsx`. Ele precisa renderizar por
 * DENTRO do `SessaoProvider` -- `RotaProtegida` e `RotaLogin` leem a sessão
 * pelo contexto -- e é por isso que não dá pra montar as duas coisas no
 * mesmo nível.
 */
export default function App() {
  return (
    <ToastProvider>
      <SessaoProvider>
        <BrowserRouter>
          <Rotas />
        </BrowserRouter>
      </SessaoProvider>
    </ToastProvider>
  );
}
