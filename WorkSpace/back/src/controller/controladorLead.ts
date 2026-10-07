import type {Request, Response} from "express"
import { conexaoBanco } from "../config/database.js"

export const criarLead = async (
    req: Request,
    res: Response
): Promise <any> => {
    const {codigo_imovel, telefone} = req.body //Requisição

    if (!codigo_imovel || !telefone) {
        return res.status(400).json({message: 'O código e telefone são obrigatórios!'})
    }

    //Limpeza do telefone (mantém apenas os números)
    const telefoneDigitos = String(telefone).replace(/\D/g, '')

    if (telefoneDigitos.length < 10 || telefoneDigitos.length > 11) {
        return res.status(400).json({message: 'O telefone deve ter 10 ou 11 digitos...'})
    }

    // Bloco try e catch :)

    try {
        const queryText = `
            INSERT into leads (id_imovel, telefone)
            VALUES ($1, $2) 
            RETURNING *
        `

        const valores = [codigo_imovel, telefoneDigitos];

        const resultado = await conexaoBanco.query(queryText, valores)

        return res.status(201).json({message: 'Interesse registrado com sucesso!', lead: resultado.rows[0]})
    }catch (erro: any) {
        console.log('Erro interno no servidor :(', erro)
        // O code 23503 é o erro do pgAdmin
        /*ERROR:  insert or update on table "leads" violates foreign key constraint "fk_imovel"
        Key (id_imovel)=(CODIGO_ERRADO) is not present in table "imoveis". 

        ERRO:  insert or update on table "leads" violates foreign key constraint "fk_imovel"
        SQL state: 23503 --> Esse aqui
        Detail: Key (id_imovel)=(CODIGO_ERRADO) is not present in table "imoveis". */
        
        if (erro.code === '23503') {
            return res.status(400).json({message: 'Não foi possível cadastrar o interesse... Esse código de imóvel não existe'})
        }

        return res.status(500).json({message: 'Erro interno...'})    
    }
}
 