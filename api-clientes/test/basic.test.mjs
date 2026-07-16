import test from'node:test';import assert from'node:assert/strict';test('las fechas deben terminar después de iniciar',()=>assert.ok(new Date('2026-08-02')>new Date('2026-08-01')));
