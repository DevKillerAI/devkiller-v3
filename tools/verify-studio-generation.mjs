import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from '../tests/knowledge-server.mjs';
const s=await createServer();try{const child=spawn(process.execPath,['node_modules/@playwright/test/cli.js','test','tests/design.e2e.mjs'],{windowsHide:true,stdio:'inherit',env:{...process.env,DEVKILLER_PORT:String(s.port),DEVKILLER_AI_FIXTURE:'1'}});const [code]=await once(child,'exit');if(code)process.exitCode=code;}finally{await s.cleanup();}
