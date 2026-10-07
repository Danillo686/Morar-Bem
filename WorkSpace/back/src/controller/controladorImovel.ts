import type { Request, Response } from "express";
import { conexaoBanco } from "../config/database.js";

export const listarImovel = async (
    req: Request,
    res: Response
): Promise <any> => {
    
    try {    
        const queryText = 'SELECT * FROM imoveis'

        const resultado = await conexaoBanco.query(queryText)

        return res.status(200).json({message: 'Lista de imóveis carregada com sucesso!', data: resultado.rows})
    } catch (erro: any) {
        console.log('Erro ao buscar imóveis no banco', erro)

        return res.status(500).json({message: 'Erro interno no servidor...', erro: erro.message})
    }
}