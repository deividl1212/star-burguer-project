-- ============================================================
-- Star Burguer — Script de criação do banco (rodar no SQL Editor do Supabase)
-- ============================================================

-- Tabela dos kits (produtos)
create table if not exists public.kits (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text not null default '',
  tier text not null default 'ouro', -- bronze | prata | ouro | premium (define a cor no site)
  ativo boolean not null default true,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

-- Tabela das opções de cada kit (preço + itens inclusos)
create table if not exists public.kit_opcoes (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid not null references public.kits(id) on delete cascade,
  label text not null,            -- ex: "6 Carnes"
  preco numeric(10,2) not null,
  itens text[] not null default '{}', -- ex: {"6 Carnes Bovina de 160g","6 Pães Brioche"}
  ordem integer not null default 0
);

-- Ativa a segurança (Row Level Security) nas duas tabelas
alter table public.kits enable row level security;
alter table public.kit_opcoes enable row level security;

-- Leitura: liberada para todo mundo (site público precisa ler o cardápio)
create policy "Leitura publica kits" on public.kits
  for select using (true);

create policy "Leitura publica kit_opcoes" on public.kit_opcoes
  for select using (true);

-- Escrita (criar/editar/apagar): só para usuários autenticados (o painel /admin)
create policy "Escrita autenticada kits" on public.kits
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Escrita autenticada kit_opcoes" on public.kit_opcoes
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ============================================================
-- Dados iniciais (os 4 kits que já estão no protótipo)
-- ============================================================

do $$
declare
  id_duplo uuid;
  id_economico uuid;
  id_classico uuid;
  id_premium uuid;
  desc_padrao text := 'Mergulhe na conveniência e na delícia dos hambúrgueres gourmet com o Kit Star Burguer. Peça seus kits hoje mesmo e descubra como é fácil e prazeroso apreciar refeições com qualidade de restaurante no conforto da sua casa.';
begin
  insert into public.kits (nome, descricao, tier, ordem) values ('Kit Star Duplo', desc_padrao, 'bronze', 1) returning id into id_duplo;
  insert into public.kit_opcoes (kit_id, label, preco, itens, ordem) values
    (id_duplo, '2 Carnes', 34.99, array['2 Carnes Bovina de 160g','2 Pães Brioche','2 Fatias de Queijo Cheddar','4 Fatias de Bacon'], 1);

  insert into public.kits (nome, descricao, tier, ordem) values ('Kit Econômico', desc_padrao, 'prata', 2) returning id into id_economico;
  insert into public.kit_opcoes (kit_id, label, preco, itens, ordem) values
    (id_economico, '6 Carnes', 79.90, array['6 Carnes Bovina de 160g','6 Pães Brioche','6 Fatias de Queijo Cheddar','Molhos'], 1),
    (id_economico, '10 Carnes', 119.90, array['10 Carnes Bovina de 160g','10 Pães Brioche','10 Fatias de Queijo Cheddar','Molhos'], 2);

  insert into public.kits (nome, descricao, tier, ordem) values ('Kit Clássico', desc_padrao, 'ouro', 3) returning id into id_classico;
  insert into public.kit_opcoes (kit_id, label, preco, itens, ordem) values
    (id_classico, '6 Carnes', 124.90, array['6 Carnes Bovina de 160g','6 Pães Brioche','6 Fatias de Queijo Cheddar','12 Fatias de Bacon','Picles Agridoce','Molhos'], 1),
    (id_classico, '10 Carnes', 149.90, array['10 Carnes Bovina de 160g','10 Pães Brioche','10 Fatias de Queijo Cheddar','20 Fatias de Bacon','Picles Agridoce','Molhos'], 2);

  insert into public.kits (nome, descricao, tier, ordem) values ('Kit Premium', desc_padrao, 'premium', 4) returning id into id_premium;
  insert into public.kit_opcoes (kit_id, label, preco, itens, ordem) values
    (id_premium, '6 Carnes', 144.90, array['6 Carnes Bovina de 160g','6 Pães Brioche','6 Fatias de Queijo Cheddar','12 Fatias de Bacon','Picles Agridoce','Cebola Roxa','Tomate','Alface Americana','Molhos'], 1),
    (id_premium, '10 Carnes', 189.90, array['10 Carnes Bovina de 160g','10 Pães Brioche','10 Fatias de Queijo Cheddar','20 Fatias de Bacon','Picles Agridoce','Cebolas Roxas','Tomate','Alface Americana','Molhos'], 2);
end $$;
