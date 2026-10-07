import { Router } from "express";

import { criarLead } from "../controller/controladorLead.js";
import { listarImovel } from "../controller/controladorImovel.js";

const Rotas = Router()

Rotas.get('/lista', listarImovel)
Rotas.post('/lead', criarLead)

export default Rotas