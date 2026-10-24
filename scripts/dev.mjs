import {createServer} from 'node:http';
import {spawnSync} from 'node:child_process';
spawnSync(process.execPath,['scripts/assemble.mjs'],{stdio:'inherit'});
const {default:worker}=await import('../worker/index.js?'+Date.now());
const server=createServer(async(req,res)=>{try{
 const origin='http://127.0.0.1:'+(process.env.PORT||3400);
 const chunks=[];let n=0;for await(const chunk of req){n+=chunk.length;if(n>9*1024*1024){res.writeHead(413);res.end('Too large');return;}chunks.push(chunk);}
 const headers=new Headers(req.headers);headers.set('oai-authenticated-user-id','local-owner');
 const request=new Request(origin+req.url,{method:req.method,headers,body:!['GET','HEAD'].includes(req.method)?Buffer.concat(chunks):undefined});
 const response=await worker.fetch(request,process.env,{});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.writeHead(500,{'content-type':'application/json'});res.end(JSON.stringify({error:'本地服务暂时不可用。'}));}});
server.listen(Number(process.env.PORT||3400),'127.0.0.1',()=>console.log('Hibi English: http://127.0.0.1:'+(process.env.PORT||3400)));
