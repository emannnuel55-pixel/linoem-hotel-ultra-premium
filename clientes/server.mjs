import express from 'express';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const app=express(), root=path.dirname(fileURLToPath(import.meta.url));
app.disable('x-powered-by'); app.use(express.static(path.join(root,'public'),{maxAge:'1h'}));
app.get('/config.js',(_,res)=>res.type('js').send(`window.LINOEM={API_URL:${JSON.stringify(process.env.API_URL||'http://localhost:4000')}}`));
app.use((_,res)=>res.sendFile(path.join(root,'public/index.html')));
app.listen(process.env.PORT||3000,()=>console.log('Portal clientes listo'));
