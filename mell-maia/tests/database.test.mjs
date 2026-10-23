import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
let db;
const owner='40000000-0000-4000-8000-000000000001',manager='40000000-0000-4000-8000-000000000002',outsider='40000000-0000-4000-8000-000000000003';
const s1='10000000-0000-4000-8000-000000000001',s2='10000000-0000-4000-8000-000000000002';
const product='20000000-0000-4000-8000-000000000001',variant='30000000-0000-4000-8000-000000000001';
async function as(role,uid,fn,aal='aal2'){
 await db.exec('begin');
 try{await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:uid,aal})]);await db.exec(`set local role ${role}`);const result=await fn();await db.exec('commit');return result;}catch(e){await db.exec('rollback');throw e;}
}
const query=async(sql,args=[])=>(await db.query(sql,args)).rows;
async function reserve(qty=1){return (await query('select public.reserve_checkout($1,$2,$3,$4) as id',[s1,JSON.stringify([{variant_id:variant,quantity:qty}]),'Cliente Teste','cliente@example.com']))[0].id;}
before(async()=>{
 db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;grant usage on schema public,auth to anon,authenticated,service_role;grant execute on function auth.jwt(),auth.uid() to anon,authenticated,service_role;`);
 await db.exec(await readFile(new URL('../supabase/migrations/202610200001_core.sql',import.meta.url),'utf8'));
 await db.exec(`create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text);alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated;grant select on storage.objects to anon,authenticated;grant insert on storage.objects to authenticated;`);
 await db.exec(await readFile(new URL('../supabase/migrations/202610200002_storage.sql',import.meta.url),'utf8'));
 await db.query('insert into auth.users values($1),($2),($3)',[owner,manager,outsider]);
 await db.query("insert into public.store_members values($1,$2,'owner'),($3,$2,'manager')",[owner,s1,manager]);
 await db.query("insert into public.products(id,name,brand,category,description,image_url,active) values($1,'Produto teste','Mell','feminino','Descrição de teste','https://images.unsplash.com/photo-example',true)",[product]);
 await db.query("insert into public.inventory(id,product_id,store_id,size,sku,price_cents,stock) values($1,$2,$3,'36','TEST-36',15990,12)",[variant,product,s1]);
});
after(async()=>db?.close());
test('public reads catalog but cannot read orders or create reservations',async()=>{
 assert.equal((await as('anon',null,()=>query('select * from public.stores'))).length,3);
 await assert.rejects(as('anon',null,()=>query('select * from public.orders')),/permission denied/);
 await assert.rejects(as('anon',null,()=>reserve()),/permission denied/);
 await assert.rejects(as('anon',null,()=>query('update public.inventory set stock=999')),/permission denied/);
});
test('manager cannot modify another store or promote themselves',async()=>{
 const result=await as('authenticated',manager,()=>query("update public.stores set name='Ataque' where id=$1 returning id",[s2]));assert.equal(result.length,0);
 await assert.rejects(as('authenticated',manager,()=>query("update public.store_members set role='owner'")),/permission denied/);
 assert.equal((await as('authenticated',manager,()=>query("update public.products set name='Ataque' returning id"))).length,0);
});
test('manager can edit their store; aal1 cannot mutate',async()=>{
 assert.equal((await as('authenticated',manager,()=>query("update public.stores set hours='Seg a sex' where id=$1 returning id",[s1]))).length,1);
 assert.equal((await as('authenticated',manager,()=>query("update public.stores set hours='Ataque' where id=$1 returning id",[s1]),'aal1')).length,0);
 await assert.rejects(as('authenticated',manager,()=>query("select public.save_inventory($1,$2,$3,'36','TEST-36',15990,12,'conferência')",[variant,product,s1]),'aal1'),/Acesso não autorizado/);
});
test('stock is reserved and insufficient second reservation rolls back',async()=>{
 const id=await as('service_role',null,()=>reserve(10));
 assert.equal((await query('select reserved from public.inventory where id=$1',[variant]))[0].reserved,10);
 await assert.rejects(as('service_role',null,()=>reserve(3)),/disponibilidade/);
 await as('service_role',null,()=>query('select public.cancel_checkout($1)',[id]));
 assert.equal((await query('select reserved from public.inventory where id=$1',[variant]))[0].reserved,0);
});
test('price is server authoritative; paid event is idempotent and refund does not restock',async()=>{
 const id=await as('service_role',null,()=>reserve(2));assert.equal((await query('select total_cents from public.orders where id=$1',[id]))[0].total_cents,31980);
 await assert.rejects(as('service_role',null,()=>query("select public.apply_payment($1,'pay-1','approved',1)",[id])),/divergente/);
 for(let i=0;i<2;i++)await as('service_role',null,()=>query("select public.apply_payment($1,'pay-1','approved',31980)",[id]));
 const row=(await query('select stock,reserved from public.inventory where id=$1',[variant]))[0];assert.deepEqual(row,{stock:10,reserved:0});
 await as('service_role',null,()=>query("select public.apply_payment($1,'pay-1','refunded',31980)",[id]));
 assert.equal((await query('select stock from public.inventory where id=$1',[variant]))[0].stock,10);
});
test('store scope protects orders and items from outsiders',async()=>{
 assert.ok((await as('authenticated',manager,()=>query('select * from public.orders'))).length>0);
 assert.equal((await as('authenticated',outsider,()=>query('select * from public.orders'))).length,0);
 assert.equal((await as('authenticated',outsider,()=>query('select * from public.order_items'))).length,0);
 assert.equal((await as('authenticated',manager,()=>query('select * from public.orders'),'aal1')).length,0);
});
test('expired reservation is released once and late payment with no stock is reviewed',async()=>{
 const id=await as('service_role',null,()=>reserve(3));
 await db.query("update public.orders set reserved_until=now()-interval '1 minute' where id=$1",[id]);
 await as('service_role',null,()=>query('select public.expire_reservations()'));
 await as('service_role',null,()=>query('select public.expire_reservations()'));
 assert.equal((await query('select reserved from public.inventory where id=$1',[variant]))[0].reserved,0);
 await db.query('update public.inventory set stock=0 where id=$1',[variant]);
 await as('service_role',null,()=>query("select public.apply_payment($1,'pay-late','approved',47970)",[id]));
 assert.equal((await query('select status from public.orders where id=$1',[id]))[0].status,'review');
});
test('stock adjustment and store sale enforce role, stock and audit reason',async()=>{
 await as('authenticated',manager,()=>query("select public.save_inventory($1,$2,$3,'36','TEST-36',15990,5,'Reposição teste')",[variant,product,s1]));
 await assert.rejects(as('authenticated',outsider,()=>query("select public.record_store_sale($1,1,'Cliente teste')",[variant])),/Acesso não autorizado/);
 await as('authenticated',manager,()=>query("select public.record_store_sale($1,2,'Cliente teste')",[variant]));
 assert.equal((await query('select stock from public.inventory where id=$1',[variant]))[0].stock,3);
 assert.ok((await query("select * from public.audit_logs where reason='Reposição teste'")).length>0);
 await assert.rejects(as('authenticated',manager,()=>query('delete from public.audit_logs')),/permission denied/);
});
test('storage accepts owner images and rejects managers, aal1 and active formats',async()=>{
 const insert=(name)=>query("insert into storage.objects(bucket_id,name) values('products',$1)",[name]);
 await as('authenticated',owner,()=>insert('aaaaaaaa-0000-4000-8000-000000000001.jpg'));
 await assert.rejects(as('authenticated',manager,()=>insert('aaaaaaaa-0000-4000-8000-000000000002.jpg')),/row-level security/);
 await assert.rejects(as('authenticated',owner,()=>insert('aaaaaaaa-0000-4000-8000-000000000003.jpg'),'aal1'),/row-level security/);
 await assert.rejects(as('authenticated',owner,()=>insert('aaaaaaaa-0000-4000-8000-000000000004.svg')),/row-level security/);
 assert.equal((await query("select file_size_limit from storage.buckets where id='products'"))[0].file_size_limit,5242880);
});
