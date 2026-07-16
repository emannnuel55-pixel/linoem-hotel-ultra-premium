import { existsSync } from 'node:fs';
const required=['clientes/server.mjs','empleados/server.mjs','api-clientes/src/server.mjs','api-empleados/src/server.mjs'];
const missing=required.filter(x=>!existsSync(new URL('../'+x,import.meta.url)));
if(missing.length) throw new Error('Faltan: '+missing.join(', '));
console.log('Estructura LINOEM verificada');
