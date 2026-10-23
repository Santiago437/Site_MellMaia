-- Run once through Supabase migrations. All money is integer BRL cents.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;

create table public.stores (
 id uuid primary key default gen_random_uuid(), label text not null unique,
 name text not null check(length(name) between 2 and 100),
 address text not null check(length(address) between 10 and 500),
 phone text check(phone ~ '^55[0-9]{10,11}$'), hours text not null default '' check(length(hours)<=200)
);
create table public.store_members (
 user_id uuid not null references auth.users(id) on delete cascade,
 store_id uuid not null references public.stores(id), role text not null check(role in ('owner','manager')),
 primary key(user_id,store_id)
);
create index store_members_store_idx on public.store_members(store_id);
create table public.products (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 120),
 brand text not null check(length(brand) between 1 and 80),
 category text not null check(category in ('feminino','masculino','infantil-feminino','infantil-masculino','bolsas')),
 description text not null check(length(description) between 1 and 2000),
 image_url text not null check(image_url ~ '^https://(images\.unsplash\.com/|[a-z0-9-]+\.supabase\.co/storage/v1/object/public/products/)'),
 active boolean not null default false, featured boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.inventory (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id),
 store_id uuid not null references public.stores(id), size text not null check(length(size) between 1 and 20),
 sku text not null unique check(length(sku) between 1 and 60),
 price_cents integer not null check(price_cents between 1 and 10000000),
 stock integer not null default 0 check(stock between 0 and 100000),
 reserved integer not null default 0 check(reserved>=0 and reserved<=stock),
 unique(product_id,store_id,size)
);
create index inventory_store_idx on public.inventory(store_id);
create table public.orders (
 id uuid primary key default gen_random_uuid(),store_id uuid not null references public.stores(id),
 customer_name text not null check(length(customer_name) between 2 and 100),
 customer_email text not null default '' check(length(customer_email)<=254),
 total_cents integer not null check(total_cents between 1 and 1000000000),
 status text not null check(status in ('pending','paid','cancelled','refunded','review')),
 channel text not null check(channel in ('online','store')),created_at timestamptz not null default now(),
 reserved_until timestamptz, reservation_active boolean not null default false,
 payment_id text unique, preference_id text, paid_at timestamptz,
 consent_version text not null default '2026-10-20'
);
create index orders_store_date_idx on public.orders(store_id,created_at desc);
create index orders_expiration_idx on public.orders(reserved_until) where reservation_active;
create table public.order_items (
 order_id uuid not null references public.orders(id),variant_id uuid not null references public.inventory(id),
 product_id uuid not null references public.products(id), name text not null, size text not null,
 quantity integer not null check(quantity between 1 and 20),unit_price_cents integer not null check(unit_price_cents>0),
 primary key(order_id,variant_id)
);
create index order_items_variant_idx on public.order_items(variant_id);
create index order_items_product_idx on public.order_items(product_id);
create table public.audit_logs (
 id bigint generated always as identity primary key,actor_id uuid,store_id uuid references public.stores(id),
 entity text not null,operation text not null,record_id text not null,
 old_value jsonb,new_value jsonb,reason text,created_at timestamptz not null default now()
);
create index audit_logs_store_date_idx on public.audit_logs(store_id,created_at desc);
create table private.request_limits(key text primary key,hits integer not null,until_at timestamptz not null);

create function private.is_owner() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(auth.jwt()->>'aal','')='aal2' and exists(select 1 from public.store_members where user_id=(select auth.uid()) and role='owner');
$$;
create function private.can_manage(p_store uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(auth.jwt()->>'aal','')='aal2' and (private.is_owner() or exists(select 1 from public.store_members where user_id=(select auth.uid()) and store_id=p_store));
$$;
create function private.is_staff() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(auth.jwt()->>'aal','')='aal2' and exists(select 1 from public.store_members where user_id=(select auth.uid()));
$$;

alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.inventory enable row level security;
alter table public.store_members enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.audit_logs enable row level security;
revoke all on public.stores,public.products,public.inventory,public.store_members,public.orders,public.order_items,public.audit_logs from public,anon,authenticated;
grant select on public.stores,public.products,public.inventory to anon,authenticated;
grant select on public.store_members,public.orders,public.order_items,public.audit_logs to authenticated;
grant insert,update on public.products to authenticated;
grant update(name,address,phone,hours) on public.stores to authenticated;
grant all on public.stores,public.products,public.inventory,public.store_members,public.orders,public.order_items,public.audit_logs to service_role;
grant usage,select on sequence public.audit_logs_id_seq to service_role;

create policy stores_public on public.stores for select to anon,authenticated using(true);
create policy stores_edit on public.stores for update to authenticated using(private.can_manage(id)) with check(private.can_manage(id));
create policy products_public on public.products for select to anon,authenticated using(active or private.is_staff());
create policy products_create on public.products for insert to authenticated with check(private.is_owner());
create policy products_edit on public.products for update to authenticated using(private.is_owner()) with check(private.is_owner());
create policy inventory_public on public.inventory for select to anon,authenticated using(private.can_manage(store_id) or exists(select 1 from public.products p where p.id=product_id and p.active));
create policy members_self on public.store_members for select to authenticated using(user_id=(select auth.uid()) or private.is_owner());
create policy orders_staff on public.orders for select to authenticated using(private.can_manage(store_id));
create policy items_staff on public.order_items for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and private.can_manage(o.store_id)));
create policy audit_staff on public.audit_logs for select to authenticated using(private.is_owner() or (store_id is not null and private.can_manage(store_id)));

create function private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
declare prev jsonb; nxt jsonb; unit uuid;
begin
 if TG_OP<>'INSERT' then prev=to_jsonb(old); end if;
 if TG_OP<>'DELETE' then nxt=to_jsonb(new); end if;
 unit=case when TG_TABLE_NAME='stores' then coalesce(nxt,prev)->>'id' else coalesce(nxt,prev)->>'store_id' end;
 -- Customer identity is deliberately omitted from the audit log.
 if TG_TABLE_NAME='orders' then prev=prev-'customer_name'-'customer_email';nxt=nxt-'customer_name'-'customer_email';end if;
 insert into public.audit_logs(actor_id,store_id,entity,operation,record_id,old_value,new_value,reason)
 values(auth.uid(),unit,TG_TABLE_NAME,TG_OP,coalesce(nxt,prev)->>'id',prev,nxt,current_setting('app.adjustment_reason',true));
 return coalesce(new,old);
end $$;
create trigger audit_stores after update on public.stores for each row execute function private.audit_change();
create trigger audit_products after insert or update on public.products for each row execute function private.audit_change();
create trigger audit_inventory after insert or update on public.inventory for each row execute function private.audit_change();
create trigger audit_orders after insert or update on public.orders for each row execute function private.audit_change();

create function public.save_inventory(p_id uuid,p_product_id uuid,p_store_id uuid,p_size text,p_sku text,p_price integer,p_stock integer,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare v public.inventory;
begin
 if not private.can_manage(p_store_id) then raise exception 'Acesso não autorizado' using errcode='42501';end if;
 if p_reason is null or length(trim(p_reason)) not between 3 and 200 then raise exception 'Informe o motivo do ajuste';end if;
 perform set_config('app.adjustment_reason',p_reason,true);
 select * into v from public.inventory where id=p_id for update;
 if found then
  if v.store_id<>p_store_id or v.product_id<>p_product_id or v.size<>p_size then raise exception 'Variação não pode ser transferida';end if;
  if p_stock<v.reserved then raise exception 'Estoque menor que a quantidade reservada';end if;
  update public.inventory set price_cents=p_price,stock=p_stock,sku=p_sku where id=p_id;
 else
  insert into public.inventory(id,product_id,store_id,size,sku,price_cents,stock) values(p_id,p_product_id,p_store_id,p_size,p_sku,p_price,p_stock);
 end if;
end $$;

create function public.record_store_sale(p_variant_id uuid,p_quantity integer,p_customer text) returns uuid language plpgsql security definer set search_path='' as $$
declare v public.inventory;p public.products;oid uuid=gen_random_uuid();
begin
 select * into v from public.inventory where id=p_variant_id for update;
 if not found or not private.can_manage(v.store_id) then raise exception 'Acesso não autorizado' using errcode='42501';end if;
 if p_quantity is null or p_quantity not between 1 and 20 or v.stock-v.reserved<p_quantity then raise exception 'Quantidade indisponível';end if;
 select * into p from public.products where id=v.product_id;
 if not p.active then raise exception 'Produto inativo';end if;
 insert into public.orders(id,store_id,customer_name,total_cents,status,channel,paid_at) values(oid,v.store_id,p_customer,v.price_cents*p_quantity,'paid','store',now());
 insert into public.order_items values(oid,v.id,p.id,p.name,v.size,p_quantity,v.price_cents);
 update public.inventory set stock=stock-p_quantity where id=v.id;
 return oid;
end $$;

-- These RPCs are service_role only. No browser has permission to invoke them.
create function public.reserve_checkout(p_store_id uuid,p_items jsonb,p_name text,p_email text) returns uuid language plpgsql security definer set search_path='' as $$
declare item jsonb;v public.inventory;p public.products;oid uuid=gen_random_uuid();amount bigint=0;qty integer;
begin
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 10 then raise exception 'Sacola inválida';end if;
 if (select count(distinct x->>'variant_id') from jsonb_array_elements(p_items) x)<>jsonb_array_length(p_items) then raise exception 'Variações duplicadas';end if;
 -- Lock all rows in deterministic UUID order across every checkout.
 for item in select value from jsonb_array_elements(p_items) order by value->>'variant_id' loop
  qty=(item->>'quantity')::integer;
  if qty is null or qty not between 1 and 20 then raise exception 'Quantidade inválida';end if;
  select * into v from public.inventory where id=(item->>'variant_id')::uuid for update;
  if not found or v.store_id<>p_store_id or v.stock-v.reserved<qty then raise exception 'Produto sem disponibilidade';end if;
  select * into p from public.products where id=v.product_id;
  if not p.active then raise exception 'Produto inativo';end if;
  amount=amount+v.price_cents::bigint*qty;
 end loop;
 insert into public.orders(id,store_id,customer_name,customer_email,total_cents,status,channel,reserved_until,reservation_active)
 values(oid,p_store_id,p_name,p_email,amount::integer,'pending','online',now()+interval '30 minutes',true);
 for item in select value from jsonb_array_elements(p_items) order by value->>'variant_id' loop
  qty=(item->>'quantity')::integer;
  select * into v from public.inventory where id=(item->>'variant_id')::uuid;
  select * into p from public.products where id=v.product_id;
  insert into public.order_items values(oid,v.id,p.id,p.name,v.size,qty,v.price_cents);
  update public.inventory set reserved=reserved+qty where id=v.id;
 end loop;
 return oid;
end $$;

create function private.release_order(p_order uuid) returns void language plpgsql security definer set search_path='' as $$
declare o public.orders;i public.order_items;
begin
 select * into o from public.orders where id=p_order for update;
 if not found or not o.reservation_active or o.status<>'pending' then return;end if;
 for i in select * from public.order_items where order_id=p_order order by variant_id loop
  update public.inventory set reserved=reserved-i.quantity where id=i.variant_id;
 end loop;
 update public.orders set reservation_active=false,status='cancelled' where id=p_order;
end $$;
create function public.cancel_checkout(p_order uuid) returns void language plpgsql security definer set search_path='' as $$begin perform private.release_order(p_order);end $$;
create function public.expire_reservations() returns integer language plpgsql security definer set search_path='' as $$
declare o record;n integer=0;
begin
 for o in select id from public.orders where reservation_active and reserved_until<now() order by id for update skip locked loop
  perform private.release_order(o.id);n=n+1;
 end loop;
 delete from private.request_limits where until_at<now()-interval '1 day';
 return n;
end $$;

create function public.apply_payment(p_order uuid,p_payment_id text,p_status text,p_total integer) returns text language plpgsql security definer set search_path='' as $$
declare o public.orders;i public.order_items;v public.inventory;enough boolean=true;
begin
 select * into o from public.orders where id=p_order for update;
 if not found or o.channel<>'online' then raise exception 'Pedido inválido';end if;
 if o.total_cents<>p_total then raise exception 'Valor divergente';end if;
 if o.payment_id is not null and o.payment_id<>p_payment_id then
  -- A second payment for the same preference must be investigated/refunded.
  if p_status='approved' then update public.orders set status='review' where id=o.id;end if;
  return 'review';
 end if;
 if p_status='approved' then
  if o.status in ('paid','refunded','review') then return o.status;end if;
  for i in select * from public.order_items where order_id=o.id order by variant_id loop
   select * into v from public.inventory where id=i.variant_id for update;
   if not o.reservation_active and v.stock-v.reserved<i.quantity then enough=false;end if;
  end loop;
  if not enough then update public.orders set status='review',payment_id=p_payment_id where id=o.id;return 'review';end if;
  for i in select * from public.order_items where order_id=o.id order by variant_id loop
   update public.inventory set stock=stock-i.quantity,reserved=reserved-case when o.reservation_active then i.quantity else 0 end where id=i.variant_id;
  end loop;
  update public.orders set status='paid',payment_id=p_payment_id,paid_at=now(),reservation_active=false where id=o.id;
 elsif p_status in ('refunded','charged_back') then
  if o.reservation_active then perform private.release_order(o.id);end if;
  update public.orders set status=case when p_status='refunded' then 'refunded' else 'review' end,payment_id=p_payment_id where id=o.id;
  -- Refund is not a physical return. Stock is deliberately not replenished.
 end if;
 return (select status from public.orders where id=o.id);
end $$;

create function public.consume_rate_limit(p_key text) returns boolean language plpgsql security definer set search_path='' as $$
declare count_hits integer;
begin
 insert into private.request_limits(key,hits,until_at) values(p_key,1,now()+interval '10 minutes')
 on conflict(key) do update set hits=case when request_limits.until_at<now() then 1 else request_limits.hits+1 end,
 until_at=case when request_limits.until_at<now() then now()+interval '10 minutes' else request_limits.until_at end returning hits into count_hits;
 return count_hits<=5;
end $$;

revoke execute on all functions in schema private from public,anon,authenticated;
grant execute on function private.is_owner(),private.can_manage(uuid),private.is_staff() to authenticated;
-- Public read policies call these helpers even for visitors; they only return booleans.
grant usage on schema private to anon;
grant execute on function private.is_owner(),private.can_manage(uuid),private.is_staff() to anon;
revoke execute on function public.save_inventory(uuid,uuid,uuid,text,text,integer,integer,text),public.record_store_sale(uuid,integer,text),public.reserve_checkout(uuid,jsonb,text,text),public.cancel_checkout(uuid),public.expire_reservations(),public.apply_payment(uuid,text,text,integer),public.consume_rate_limit(text) from public,anon,authenticated;
grant execute on function public.save_inventory(uuid,uuid,uuid,text,text,integer,integer,text),public.record_store_sale(uuid,integer,text) to authenticated;
grant execute on function public.reserve_checkout(uuid,jsonb,text,text),public.cancel_checkout(uuid),public.expire_reservations(),public.apply_payment(uuid,text,text,integer),public.consume_rate_limit(text) to service_role;

insert into public.stores(id,label,name,address,phone) values
 ('10000000-0000-4000-8000-000000000001','Loja 01','Jardim Cristina','Av. Suaçuna, 683 — Jardim Cristina, Campinas/SP','5519988677191'),
 ('10000000-0000-4000-8000-000000000002','Loja 02','Shopping Parque das Bandeiras','Av. John Boyd Dunlop, 3900 — Piso 2 — Shopping Parque das Bandeiras, Campinas/SP','5519989696934'),
 ('10000000-0000-4000-8000-000000000003','Loja 03','Centro','Rua Benedito Cavalcante Pinto, 317 — Loja 15 — Centro, Campinas/SP',null);
