# Morar Bem

Aplicação de vitrine imobiliária com frontend React/Vite, API Rust e banco Supabase.

## Banco de dados

No SQL Editor do Supabase, execute [`supabase/schema.sql`](./supabase/schema.sql). O script cria as tabelas `imoveis` e `leads` e inclui dois imóveis de exemplo.

## API Rust

A API preserva o contrato consumido pelo frontend:

- `GET /api/lista` lista os imóveis;
- `POST /api/lead` recebe `{"codigo_imovel":"AP01","telefone":"(11) 99999-1234"}` e registra o interesse.

Configure as variáveis no ambiente de execução, nunca no frontend:

| Variável | Uso |
| --- | --- |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave secreta de servidor do Supabase |
| `FRONTEND_ORIGIN` | Origem do frontend autorizada por CORS; aceita várias origens separadas por vírgula |

Para executar localmente, instale o [Vercel CLI](https://vercel.com/docs/cli), copie `back/.env.example` para `back/.env`, preencha os dados do Supabase e rode `vercel dev` dentro de `back`. As funções ficam disponíveis em `http://localhost:3000/api/lista` e `http://localhost:3000/api/lead`.

## Frontend

Em `front`, copie `.env.example` para `.env.local` e configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` com os valores públicos do projeto Supabase. Use a chave publishable (`sb_publishable_...`) ou, em projetos antigos, a chave anon. Nunca coloque a chave `service_role` ou uma chave secreta em variáveis `VITE_`. Reinicie o Vite depois de alterar o arquivo.

No Supabase, habilite o provedor de e-mail em Authentication e adicione as URLs locais e de produção à lista de URLs de redirecionamento. O login usa contas existentes; a tela **Esqueci minha senha** envia o e-mail de recuperação pelo Supabase Auth. Não há cadastro público de contas.

Execute `npm install` e `npm run dev`. O proxy do Vite encaminha `/api` para a API local na porta 3000. Na implantação separada, defina `VITE_API_URL` somente como a origem pública do projeto Vercel da API (por exemplo, `https://morar-bem-back.vercel.app`), sem `/api/lista` ou `/api/lead`. O frontend usa essas rotas nos próprios pedidos.

Na vitrine, o frontend tenta primeiro a API Rust. Se ela falhar (incluindo erros de rede ou CORS), consulta os imóveis diretamente no Supabase e também registra leads por lá. Para habilitar esse modo, execute novamente `supabase/schema.sql` no SQL Editor: ele concede leitura pública apenas de imóveis e inserção de leads, sem permitir a leitura pública dos telefones cadastrados. Configure também a origem de produção do frontend em `FRONTEND_ORIGIN` na API para o caminho normal sem fallback funcionar.

O painel **Cadastros > Novo Cliente** contém os campos obrigatórios nome, e-mail e telefone. O formulário está em modo de demonstração e não persiste clientes, conforme o escopo escolhido. A vitrine pública existente permanece disponível em `/vitrine`.

## Implantação na Vercel

Crie dois projetos ligados ao mesmo repositório:

1. **API:** defina o Root Directory como `WorkSpace/back`. O runtime Rust detecta as funções em `api/`. Configure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `FRONTEND_ORIGIN` nas variáveis do projeto. Use a origem pública exata do frontend, por exemplo `https://morar-bem-ball.vercel.app`, sem caminho nem barra final.
2. **Frontend:** defina o Root Directory como `WorkSpace/front`. Use o framework Vite e configure `VITE_API_URL`, `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. O `vercel.json` desse diretório redireciona rotas da SPA, como `/vitrine`, para o frontend. Cadastre também a URL do frontend em Authentication > URL Configuration no Supabase. Essas variáveis são aplicadas durante o build; faça um novo deploy após configurá-las.

Mantenha `SUPABASE_SERVICE_ROLE_KEY` somente nas variáveis secretas do projeto da API; ela não deve receber o prefixo `VITE_` nem ser adicionada ao frontend.
