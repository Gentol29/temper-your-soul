import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile,unlink} from 'node:fs/promises';
const path=new URL('../.tools/cloudflare-tunnel.json',import.meta.url);
await mkdir(new URL('../.tools/',import.meta.url),{recursive:true});
const port=process.env.PORT??'4173';
const child=spawn('cloudflared',['tunnel','--url',`http://127.0.0.1:${port}`,'--protocol','http2'],{windowsHide:true,stdio:['ignore','pipe','pipe']});
let recent='',saved='',writes=Promise.resolve();
function log(chunk){
  process.stdout.write(chunk);recent=(recent+chunk.toString()).slice(-8192);
  const origin=recent.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com\b/i)?.[0];
  if(origin&&origin!==saved){saved=origin;writes=writes.then(()=>writeFile(path,JSON.stringify({origin,pid:child.pid,port:Number(port)}),'utf8'));}
}
child.stdout.on('data',log);child.stderr.on('data',log);
child.on('error',error=>{console.error('Impossibile avviare cloudflared:',error.message);process.exitCode=1;});
child.on('exit',async code=>{await writes;try{const record=JSON.parse(await readFile(path,'utf8'));if(record.pid===child.pid)await unlink(path);}catch{}process.exitCode=code??0;});
process.on('SIGINT',()=>child.kill());process.on('SIGTERM',()=>child.kill());
