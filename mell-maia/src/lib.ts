import {createClient} from '@supabase/supabase-js';
import type {Data,Order} from './types';
const env=(import.meta as unknown as {env:Record<string,string>}).env;
export const supabase=env.VITE_SUPABASE_URL&&env.VITE_SUPABASE_ANON_KEY?createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:false}}):null;
export const isDemo=!supabase;
export const money=(cents:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
export const date=(d:string)=>new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeZone:'America/Sao_Paulo'}).format(new Date(d));
export const localDay=(d:string|Date=new Date())=>new Date(d).toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
export const available=(v:{stock:number;reserved:number})=>Math.max(0,v.stock-v.reserved);
export const maps=(address:string)=>`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
export const whatsapp=(phone:string,text='Olá! Gostaria de saber mais sobre os produtos da Mell Maia.')=>`https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
export async function loadData(admin=false):Promise<Data>{
 if(!supabase) throw Error('Supabase não configurado');
 const tables=admin?['stores','products','inventory','orders','store_members']:['stores','products','inventory'];
 const all=async(t:string)=>{const rows:Record<string,unknown>[]=[];for(let start=0;start<100000;start+=1000){let q=t==='orders'?supabase!.from(t).select('*,order_items(*)'):supabase!.from(t).select('*');q=t==='store_members'?q.order('user_id').order('store_id'):q.order('id');const r=await q.range(start,start+999);if(r.error)return {data:null,error:r.error};rows.push(...r.data as unknown as Record<string,unknown>[]);if(r.data.length<1000)return {data:rows,error:null};}throw Error('Volume de registros acima do limite de leitura; configure relatórios agregados no servidor.');};
 const res=await Promise.all(tables.map(all));
 res.forEach(r=>{if(r.error)throw r.error;});
 return {stores:res[0].data as Data['stores'],products:res[1].data as Data['products'],variants:res[2].data as Data['variants'],orders:(res[3]?.data||[]).map(o=>({...o,items:o.order_items})) as Order[],members:(res[4]?.data||[]) as Data['members']};
}
export function exportCsv(rows:Record<string,unknown>[],name:string){
 if(!rows.length)return;
 const escape=(v:unknown)=>{let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
 const content='\uFEFF'+[Object.keys(rows[0]),...rows.map(r=>Object.values(r))].map(r=>r.map(escape).join(';')).join('\r\n');
 const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download=name+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function safeImage(url:string){try{const u=new URL(url,location.origin);return u.origin===location.origin||u.protocol==='https:'&&(u.hostname==='images.unsplash.com'||u.hostname.endsWith('.supabase.co'));}catch{return false;}}
