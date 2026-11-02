create table if not exists public.imoveis (
    codigo varchar(50) primary key,
    titulo varchar(150) not null,
    preco numeric(10, 2) not null
);

create table if not exists public.leads (
    id serial primary key,
    id_imovel varchar(50) not null,
    telefone varchar(20) not null,
    data_descricao timestamp without time zone not null default current_timestamp,
    constraint fk_imovel
        foreign key (id_imovel)
        references public.imoveis(codigo)
        on delete cascade
);

create table if not exists public.clientes (
    id uuid primary key default gen_random_uuid(),
    nome varchar(120) not null,
    email varchar(254) not null,
    telefone varchar(11) not null,
    consentimento_contato boolean not null default false,
    criado_em timestamp with time zone not null default current_timestamp,
    constraint clientes_nome_valido check (length(btrim(nome)) between 2 and 120),
    constraint clientes_email_valido check (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
    constraint clientes_telefone_valido check (telefone ~ '^[0-9]{10,11}$'),
    constraint clientes_consentimento_obrigatorio check (consentimento_contato)
);

alter table public.imoveis enable row level security;
alter table public.leads enable row level security;
alter table public.clientes enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.imoveis to anon, authenticated;
grant insert on public.leads to anon, authenticated;
grant usage, select on sequence public.leads_id_seq to anon, authenticated;

revoke all on public.clientes from public, anon, authenticated;
grant insert on public.clientes to anon, authenticated;

drop policy if exists "Public can read properties" on public.imoveis;
create policy "Public can read properties"
    on public.imoveis
    for select
    to anon, authenticated
    using (true);

drop policy if exists "Public can submit leads" on public.leads;
create policy "Public can submit leads"
    on public.leads
    for insert
    to anon, authenticated
    with check (
        length(telefone) between 10 and 11
        and telefone !~ '[^0-9]'
    );

drop policy if exists "Public can register clients" on public.clientes;
create policy "Public can register clients"
    on public.clientes
    for insert
    to anon, authenticated
    with check (
        length(btrim(nome)) between 2 and 120
        and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
        and telefone ~ '^[0-9]{10,11}$'
        and consentimento_contato
    );

insert into public.imoveis (codigo, titulo, preco)
values
    ('AP01', 'Apartamento', 250.00),
    ('CA02', 'Casa Simples', 315.00)
on conflict (codigo) do nothing;
