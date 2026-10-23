import type {Data,Product,Store,Variant,Order} from './types';
export const categories = [{id:'all',name:'Todos'},{id:'feminino',name:'Feminino'},{id:'masculino',name:'Masculino'},{id:'infantil-feminino',name:'Infantil feminino'},{id:'infantil-masculino',name:'Infantil masculino'},{id:'bolsas',name:'Bolsas'}];
export const stores:Store[] = [
 {id:'10000000-0000-4000-8000-000000000001',name:'Jardim Cristina',label:'Loja 01',address:'Av. Suaçuna, 683 — Jardim Cristina, Campinas/SP',phone:'5519988677191',hours:''},
 {id:'10000000-0000-4000-8000-000000000002',name:'Shopping Parque das Bandeiras',label:'Loja 02',address:'Av. John Boyd Dunlop, 3900 — Piso 2 — Shopping Parque das Bandeiras, Campinas/SP',phone:'5519989696934',hours:''},
 {id:'10000000-0000-4000-8000-000000000003',name:'Centro',label:'Loja 03',address:'Rua Benedito Cavalcante Pinto, 317 — Loja 15 — Centro, Campinas/SP',phone:null,hours:''}
];
export const photo=(id:string,w=800)=>`https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=85`;
const list=[
 ['Sandália Luna','Mell Seleção','feminino','photo-1543163521-1bf539c55dd2',15990,'Uma sandália delicada para acompanhar seus melhores momentos.'],
 ['Tênis Urban White','Mell Essenciais','feminino','photo-1549298916-b41d501d3772',18990,'Conforto para todos os caminhos do seu dia.'],
 ['Bolsa Everyday','Mell Acessórios','bolsas','photo-1548036328-c9fa89d128fa',13990,'Praticidade e elegância em uma bolsa que vai com você.'],
 ['Tênis Casual Classic','Mell Essenciais','masculino','photo-1600269452121-4f2416e55c28',21990,'Versatilidade e leveza para a rotina.'],
 ['Sapatilha Laço','Mell Kids','infantil-feminino','photo-1514989940723-e8e51635b782',8990,'Para pequenos passos cheios de personalidade.'],
 ['Tênis Mini Aventura','Mell Kids','infantil-masculino','photo-1514989940723-e8e51635b782',11990,'Pronto para brincar e descobrir novos caminhos.'],
 ['Scarpin Essencial','Mell Seleção','feminino','photo-1515347619252-60a4bf4fff4f',17990,'Um clássico para deixar cada ocasião especial.'],
 ['Tênis Sport Move','Mell Essenciais','masculino','photo-1542291026-7eec264c27ff',24990,'Leveza e estilo do primeiro ao último passo.']
] as const;
export const demoProducts:Product[]=list.map((p,i)=>({id:`20000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,name:p[0],brand:p[1],category:p[2],image_url:photo(p[3]),description:p[5],active:true,featured:i<4}));
export const demoVariants:Variant[]=demoProducts.flatMap((p,i)=>stores.flatMap((s,j)=>(p.category==='bolsas'?['Único']:p.category.startsWith('infantil')?['25','26','27','28','29']:['35','36','37','38','39','40']).map((size,k)=>({id:`30000000-0000-4000-8000-${String(i*100+j*10+k+1).padStart(12,'0')}`,product_id:p.id,store_id:s.id,size,price_cents:list[i][4],stock:(i+j+k)%9+1,reserved:0,sku:`MM-${i+1}-${j+1}-${size}`}))));
export function initialData():Data {
 const orders:Order[]=Array.from({length:48},(_,i)=>{const v=demoVariants[(i*7)%demoVariants.length],p=demoProducts.find(p=>p.id===v.product_id)!;const d=new Date();d.setDate(d.getDate()-(i%28));d.setHours(10+(i%9),i%60,0,0);return {id:`demo-${String(1048-i)}`,store_id:v.store_id,customer_name:'Cliente de exemplo',customer_email:'exemplo@example.com',total_cents:v.price_cents*(i%3+1),status:i%9===0?'pending':'paid',channel:i%3===0?'online':'store',created_at:d.toISOString(),items:[{variant_id:v.id,product_id:p.id,name:p.name,size:v.size,quantity:i%3+1,unit_price_cents:v.price_cents}]};});
 return {stores,products:demoProducts,variants:demoVariants,orders,members:stores.map(s=>({user_id:'demo',store_id:s.id,role:'owner'}))};
}
