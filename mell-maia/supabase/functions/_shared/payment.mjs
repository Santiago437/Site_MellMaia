/** Shared by Deno Edge Functions and Node security tests. */
export async function verifySignature({signature,requestId,dataId,secret,now=Date.now()}) {
 if(!signature||!requestId||!dataId||!secret||requestId.length>200||dataId.length>100)return false;
 const fields=Object.fromEntries(signature.split(',').map(p=>p.trim().split('=')));
 const ts=fields.ts,hex=fields.v1;
 if(!/^\d{10,13}$/.test(ts||'')||!/^[a-f0-9]{64}$/i.test(hex||''))return false;
 const millis=Number(ts)>1e12?Number(ts):Number(ts)*1000;
 if(Math.abs(now-millis)>15*60*1000)return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 const digest=Uint8Array.from(hex.match(/../g).map(s=>parseInt(s,16)));
 const manifest=`id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
 return crypto.subtle.verify('HMAC',key,digest,new TextEncoder().encode(manifest));
}
export function paymentMatches(payment,order,collectorId,production=true){
 return payment.currency_id==='BRL'&&String(payment.collector_id)===String(collectorId)&&payment.external_reference===order.id&&Number.isFinite(payment.transaction_amount)&&Math.round(payment.transaction_amount*100)===order.total_cents&&payment.live_mode===production;
}
export function validateCart(items){
 return Array.isArray(items)&&items.length>0&&items.length<=10&&new Set(items.map(i=>i.variant_id)).size===items.length&&items.every(i=>typeof i.variant_id==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(i.variant_id)&&Number.isInteger(i.quantity)&&i.quantity>=1&&i.quantity<=20);
}
