import pg from 'pg';
import dotenv from 'dotenv';

// 1. Carrega as variáveis de ambiente configuradas no arquivo .env
dotenv.config();

// 2. Criamos o pool de conexões com os nomes das propriedades que a biblioteca exige
export const conexaoBanco = new pg.Pool({
  user: process.env.BANCO_USUARIO,
  host: process.env.BANCO_HOST,
  database: process.env.BANCO_NOME,
  password: process.env.BANCO_SENHA,
  port: Number(process.env.BANCO_PORTA),
});

// 3. Função para ligar e testar o nosso banco de dados quando o servidor iniciar
export const iniciarBanco = async (): Promise<void> => {
  try {
    // Faz uma consulta rápida para checar se o PostgreSQL está respondendo
    await conexaoBanco.query('SELECT NOW()');
    console.log('🔥 Banco de dados PostgreSQL conectado com sucesso!');
  } catch (erro) {
    console.error('❌ Erro crítico ao conectar no banco de dados:', erro);
  }
};
