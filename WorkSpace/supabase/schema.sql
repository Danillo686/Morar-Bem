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

alter table public.imoveis enable row level security;
alter table public.leads enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.imoveis to anon, authenticated;
grant insert on public.leads to anon, authenticated;
grant usage, select on sequence public.leads_id_seq to anon, authenticated;

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

insert into public.imoveis (codigo, titulo, preco)
values
    ('AP01', 'Apartamento', 250.00),
    ('CA02', 'Casa Simples', 315.00)
on conflict (codigo) do nothing;
