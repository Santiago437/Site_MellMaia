import {db,env,json,mpFetch} from '../_shared/http.ts';
import {verifySignature,paymentMatches} from '../_shared/payment.mjs';
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 try{
  const url=new URL(req.url);const id=url.searchParams.get('data.id')||'';
  if(!/^[0-9a-z-]{1,100}$/i.test(id))return json({error:'Invalid resource'},400);
  const valid=await verifySignature({signature:req.headers.get('x-signature'),requestId:req.headers.get('x-request-id'),dataId:id,secret:env('MP_WEBHOOK_SECRET')});
  if(!valid)return json({error:'Invalid signature'},401);
  // Fetch authoritative state. Never trust status or amounts in webhook body.
  const response=await mpFetch('/v1/payments/'+encodeURIComponent(id));if(!response.ok)throw Error('Payment unavailable');
  const payment=await response.json();
  if(!payment.external_reference||!/^[a-f0-9-]{36}$/i.test(payment.external_reference))return json({received:true});
  const client=db();const {data:order,error}=await client.from('orders').select('id,total_cents').eq('id',payment.external_reference).maybeSingle();if(error)throw error;if(!order)return json({received:true});
  if(!paymentMatches(payment,order,env('MP_COLLECTOR_ID'),Deno.env.get('MP_MODE')!=='sandbox'))return json({error:'Payment mismatch'},409);
  const result=await client.rpc('apply_payment',{p_order:order.id,p_payment_id:String(payment.id),p_status:payment.status,p_total:Math.round(payment.transaction_amount*100)});if(result.error)throw result.error;
  return json({received:true});
 }catch{console.error('payment_webhook_failed');return json({error:'Temporary processing failure'},503);}
});
