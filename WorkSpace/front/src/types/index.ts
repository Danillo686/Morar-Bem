export interface Imovel {
    codigo: string,
    titulo: string,
    preco: string  // <-- Mudamos para string porque o Postgres envia como texto com aspa
}