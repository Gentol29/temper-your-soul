import {spawn} from 'node:child_process';
const port=process.env.PORT??'4173';
const child=spawn('cloudflared',['tunnel','--url',`http://127.0.0.1:${port}`,'--protocol','http2'],{windowsHide:true,stdio:['ignore','pipe','pipe']});
function log(chunk){process.stdout.write(chunk);}
child.stdout.on('data',log);child.stderr.on('data',log);
child.on('error',error=>{console.error('Impossibile avviare cloudflared:',error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??0;});
process.on('SIGINT',()=>child.kill());process.on('SIGTERM',()=>child.kill());
