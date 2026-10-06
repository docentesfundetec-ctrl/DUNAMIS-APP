const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const sync = require('../sync-core');
const html = fs.readFileSync(require('node:path').join(__dirname, '../index.modular.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(s => s.trim());
scripts.forEach(s => new vm.Script(s));
function fn(name) {
    const start = html.search(new RegExp('        (?:async )?function ' + name + '\\('));
    assert.ok(start >= 0, name);
    const rest = html.slice(start);
    const next = rest.slice(1).search(/\n        (?:async )?function /);
    return next < 0 ? rest.slice(0, rest.indexOf('</script>')) : rest.slice(0, next + 1);
}
const base = { nombre: 'Curso', horario: '19:00', docente: 'A' };
assert.deepEqual(sync.merge(base, { ...base, horario: '18:00' }, { ...base, docente: 'B' }, 'cursos/1'), { nombre: 'Curso', horario: '18:00', docente: 'B' });
assert.throws(() => sync.merge(base, { ...base, horario: '18:00' }, { ...base, horario: '20:00' }, 'cursos/1'), { code: 'sync/conflict' });
assert.throws(() => sync.merge(base, undefined, { ...base, docente: 'B' }, 'cursos/1', true), { code: 'sync/conflict' });
assert.throws(() => sync.merge(undefined, base, { ...base, docente: 'B' }, 'cursos/1'), { code: 'sync/conflict' });
assert.deepEqual(sync.merge(base, base, { ...base, docente: 'B' }, 'cursos/1'), { ...base, docente: 'B' });
assert.deepEqual(sync.merge({ n: 3 }, { n: 4 }, { n: 4 }, 'notas/1'), { n: 4 });
assert.throws(() => sync.merge(base, base, undefined, 'cursos/1'), { code: 'sync/conflict' });
assert.ok(!fn('cargarDatosCoordinadorFirebase').split('return;')[1].includes('aplicarPlaneacionTecnicas2026'));
assert.ok(!fn('cargarDatosFirebase').includes('aplicarPlaneacionTecnicas2026'));
assert.ok(!fn('inicializarFirebase').includes('enablePersistence('));
assert.ok(fn('cargarDatosFirebase').includes("preservarBorradorLocal('recuperacion')"));
assert.ok(!fn('activarSincronizacionTiempoReal').includes('primeraEntrega'));
assert.ok(fn('sincronizarVistaActualDesdeFirebase').includes('senalesPendientes.push(metadata)'));

async function testTransaction() {
    const store = new Map([['cursos/1', { id: '1', nombre: 'Curso', horario: '19:00', docente: 'B' }]]);
    let writes = 0;
    const ref = (collection, id) => ({ parent: { id: collection }, id, path: collection + '/' + id });
    const context = { DunamisSync: sync, Math, Date, console,
        db: {}, estadoFirebaseSincronizado: { cursos: { '1': { id: '1', ...base } } },
        crearEstadoSincronizable: () => ({ cursos: { '1': { id: '1', ...base, horario: '18:00' } } }),
        firebaseAuth: { currentUser: { uid: 'test' } },
        firebase: { firestore: { FieldValue: { serverTimestamp: () => 'SERVER_TIME' } } },
        crearRevisionSincronizacion: () => 'revision',
        limpiarDatoSincronizable: sync.clean,
        aplicarCambioPuntualLocal: () => {}, guardarLineaBaseSincronizacion: () => {}, guardarDatosLocales: () => {},
        localStorage: { setItem() {}, getItem() { return null; } },
        firestoreDB: { collection: c => ({ doc: id => ref(c, id) }),
            runTransaction: async callback => {
                const pending = [];
                const result = await callback({
                    get: async r => ({ exists: store.has(r.path), data: () => store.get(r.path) }),
                    set: (r, data) => pending.push([r.path, data]), delete: r => pending.push([r.path, undefined])
                });
                for (const [path, data] of pending) { writes++; if (data) store.set(path, data); else store.delete(path); }
                return result;
            } }
    };
    vm.createContext(context);
    vm.runInContext(fn('ejecutarTransaccionSeguraFirebase'), context);
    await context.ejecutarTransaccionSeguraFirebase([{ tipo: 'set', ref: ref('cursos','1'), data: { id: '1', ...base, horario: '18:00' } }]);
    assert.equal(store.get('cursos/1').docente, 'B');
    assert.equal(store.get('cursos/1').horario, '18:00');
    assert.equal(store.get('cursos/1')._syncProtocol, 6);
    assert.equal(writes, 2, 'un documento y una marca de confirmación, no toda la base');
    store.set('cursos/1', { ...store.get('cursos/1'), horario: '21:00' });
    await assert.rejects(context.ejecutarTransaccionSeguraFirebase([{ tipo: 'set', ref: ref('cursos','1'), data: { id: '1', ...base, horario: '17:00' } }]), { code: 'sync/conflict' });
    assert.equal(writes, 2, 'conflicto no escribe');
}
testTransaction().then(() => console.log('OK: sintaxis, fusión de campos, conflictos, borrados, idempotencia, caché, planeación, señales y transacciones.')).catch(error => { console.error(error); process.exitCode = 1; });
