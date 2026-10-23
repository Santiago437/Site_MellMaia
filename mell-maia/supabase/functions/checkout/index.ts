import {z} from 'npm:zod@4.6.7';
import {db,env,cors,json,readLimited,mpFetch} from '../_shared/http.ts';
import {validateCart} from '../_shared/payment.mjs';
const bodySchema=z.object({store_id:z.uuid(),items:z.array(z.object({variant_id:z.uuid(),quantity:z.number().int().min(1).max(20)}).strict()).min(1).max(10),customer_name:z.string().trim().min(2).max(100),customer_email:z.email().max(254),captcha:z.string().min(1).max(2048)}).strict();
Deno.serve(async(req:Request)=>{
 let headers:Record<string,string>={};let orderId:string|undefined;let client:ReturnType<typeof db>|undefined;let preferenceRequested=false;
 try{
  headers=cors(req);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return json({error:'Método não permitido.'},405,headers);
  const origin=req.headers.get('origin')||'';
  if(headers['Access-Control-Allow-Origin']==='null')return json({error:'Origem não autorizada.'},403,headers);
  if(!req.headers.get('content-type')?.includes('application/json'))return json({error:'Envie JSON.'},415,headers);
  const body=bodySchema.safeParse(await readLimited(req));if(!body.success||!validateCart(body.data.items))return json({error:'Confira os dados do pedido.'},400,headers);
  const input=body.data;
  const captchaResp=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:env('TURNSTILE_SECRET_KEY'),response:input.captcha}),signal:AbortSignal.timeout(10000)});
  const captcha=await captchaResp.json();
  if(!captcha.success||captcha.hostname!==new URL(origin).hostname)return json({error:'Verificação de segurança inválida ou expirada. Reabra a sacola.'},403,headers);
  client=db();
  const rateKey=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(env('RATE_LIMIT_SALT')+input.customer_email.toLowerCase())))).map(n=>n.toString(16).padStart(2,'0')).join('');
  const limit=await client.rpc('consume_rate_limit',{p_key:rateKey});if(limit.error)throw limit.error;if(!limit.data)return json({error:'Muitas tentativas. Aguarde alguns minutos.'},429,headers);
  const reserve=await client.rpc('reserve_checkout',{p_store_id:input.store_id,p_items:input.items,p_name:input.customer_name,p_email:input.customer_email.toLowerCase()});
  if(reserve.error)return json({error:'Não foi possível reservar os itens. Atualize o catálogo e confira o estoque.'},409,headers);
  orderId=reserve.data;
  const order=await client.from('orders').select('id,reserved_until,order_items(*)').eq('id',orderId).single();if(order.error)throw order.error;
  const site=new URL(env('SITE_URL')).origin;if(site!==origin)throw Error('Checkout origin must match SITE_URL');
  const notification=env('SUPABASE_URL')+'/functions/v1/payment-webhook';
  const preference={items:order.data.order_items.map((i:{variant_id:string;name:string;size:string;quantity:number;unit_price_cents:number})=>({id:i.variant_id,title:`${i.name} · ${i.size}`,quantity:i.quantity,unit_price:i.unit_price_cents/100,currency_id:'BRL'})),payer:{name:input.customer_name,email:input.customer_email},external_reference:orderId,notification_url:notification,back_urls:{success:site+'/?payment=success',pending:site+'/?payment=pending',failure:site+'/?payment=failure'},auto_return:'approved',expires:true,expiration_date_to:order.data.reserved_until,payment_methods:{excluded_payment_types:[{id:'ticket'}]},statement_descriptor:'MELL MAIA'};
  // An uncertain network failure must not release stock while a preference may exist.
  preferenceRequested=true;
  const response=await mpFetch('/checkout/preferences',{method:'POST',headers:{'X-Idempotency-Key':orderId!},body:JSON.stringify(preference)});
  if(!response.ok){if(response.status>=400&&response.status<500){await client.rpc('cancel_checkout',{p_order:orderId});orderId=undefined;}throw Error('Payment provider refused checkout');}
  const pref=await response.json();const sandbox=Deno.env.get('MP_MODE')==='sandbox';const checkoutUrl=sandbox?pref.sandbox_init_point:pref.init_point;
  const parsed=new URL(checkoutUrl);if(parsed.protocol!=='https:'||!['www.mercadopago.com.br','sandbox.mercadopago.com.br'].includes(parsed.hostname))throw Error('Invalid payment URL');
  const update=await client.from('orders').update({preference_id:String(pref.id)}).eq('id',orderId);if(update.error)throw update.error;
  return json({checkout_url:parsed.href,order_id:orderId},200,headers);
 }catch{
  if(orderId&&client&&!preferenceRequested)await client.rpc('cancel_checkout',{p_order:orderId});
  // No customer data, payment token or provider response is emitted to logs.
  console.error('checkout_failed');
  return json({error:'Não foi possível iniciar o pagamento. Tente novamente em alguns minutos.'},503,headers);
 }
});
