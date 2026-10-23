const origin='http://127.0.0.1:4173';
for(const route of ['/', '/admin']){
 const response=await fetch(origin+route);
 const html=await response.text();
 if(!response.ok||!html.includes('Mell Maia Calçados'))throw Error(`Página indisponível: ${route}`);
 console.log(`${route}: HTTP ${response.status}`);
 const assets=[...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map(m=>m[1]);
 if(!assets.length)throw Error('Arquivos de aplicação não encontrados no HTML');
 for(const asset of assets){
  const file=await fetch(origin+asset);
  if(!file.ok)throw Error(`Arquivo indisponível: ${asset}`);
  const expected=asset.endsWith('.js')?'javascript':'text/css';
  if(!file.headers.get('content-type')?.includes(expected))throw Error(`Tipo de arquivo incorreto: ${asset}`);
  console.log(`  OK ${asset}`);
 }
}
