import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const openBrowser=()=>{if(process.argv.includes('--open')&&process.platform==='win32'){const child=spawn('cmd.exe',['/d','/c','start','','http://127.0.0.1:4173/'],{windowsHide:true,stdio:'ignore',detached:true});child.on('error',()=>console.log('Abra http://127.0.0.1:4173/ no navegador.'));child.unref();}};
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
try{await stat(path.join(root,'index.html'));}catch{console.error('Primeiro gere a demonstracao: npm ci e npm run build.');process.exit(1);}
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.jpeg':'image/jpeg','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.json':'application/json'};
const server=createServer(async(req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  let file=path.resolve(root,'.'+pathname);const relative=path.relative(root,file);
  if(relative.startsWith('..')||path.isAbsolute(relative)||pathname.split('/').some(s=>s.startsWith('.')||s==='_headers'||s==='_redirects')){res.writeHead(403);res.end();return;}
  try{if(!(await stat(file)).isFile())file=path.join(root,'index.html');}catch{if(path.extname(pathname)){res.writeHead(404);res.end();return;}file=path.join(root,'index.html');}
  const bytes=await readFile(file);
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'strict-origin-when-cross-origin'});
  res.end(req.method==='HEAD'?undefined:bytes);
 }catch{res.writeHead(400);res.end();}
});
server.on('error',async err=>{if(err.code==='EADDRINUSE'){try{const response=await fetch('http://127.0.0.1:4173/',{signal:AbortSignal.timeout(3000)});if(response.ok&&(await response.text()).includes('Mell Maia Calçados')){console.log('A demonstracao ja esta aberta em http://127.0.0.1:4173/');openBrowser();process.exit(0);}}catch{/* Report port conflict below. */}console.error('A porta 4173 esta ocupada por outro programa.');}else console.error(err.message);process.exit(1);});
server.listen(4173,'127.0.0.1',()=>{
 console.log('\n  MELL MAIA CALCADOS - APRESENTACAO LOCAL\n');
 console.log('  Loja:   http://127.0.0.1:4173/');
 console.log('  Painel: http://127.0.0.1:4173/admin\n');
 console.log('  Nada foi publicado na internet.');
 console.log('  Mantenha esta janela aberta durante a apresentacao.');
 console.log('  Para encerrar, feche a janela ou pressione Ctrl+C.\n');
 openBrowser();
});
