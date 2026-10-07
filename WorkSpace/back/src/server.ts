import express from "express"
import type { Response, Request } from "express"
import Rotas from "./routes/Routes.js"
import cors from "cors"

const app = express()
app.use(cors({origin: 'http://localhost:5173'})) //SEMPRE colocar o cors aqui, para ele liberar o back para o front :)
app.use(express.json())

app.get('/', (req, res) => {res.json({message:'Api funcionando'})})
app.use(Rotas)
app.listen(3001, () => {console.log('Servidor rodando em: http://localhost:3001/')})