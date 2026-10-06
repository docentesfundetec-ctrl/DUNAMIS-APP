/* Sincronización optimista: nunca convertir una caché completa en autoridad. */
(function (root) {
    'use strict';
    const clean = value => {
        if (Array.isArray(value)) return value.map(clean);
        if (!value || typeof value !== 'object') return value;
        return Object.fromEntries(Object.keys(value).sort()
            .filter(key => !['_docId', 'updatedAt', '_syncProtocol', '_syncRevision', '_baseRevision'].includes(key) && value[key] !== undefined)
            .map(key => [key, clean(value[key])]));
    };
    const equal = (a, b) => JSON.stringify(clean(a)) === JSON.stringify(clean(b));
    function conflict(path) {
        const error = new Error('El registro cambió en otro dispositivo: ' + path);
        error.code = 'sync/conflict';
        return error;
    }
    function merge(base, desired, remote, path, remove = false) {
        base = clean(base); desired = clean(desired); remote = clean(remote);
        if (remove) {
            if (remote !== undefined && !equal(base, remote)) throw conflict(path);
            return undefined;
        }
        if (base === undefined) {
            if (remote !== undefined && !equal(desired, remote)) throw conflict(path);
            return desired;
        }
        if (remote === undefined) throw conflict(path);
        const result = { ...remote };
        for (const key of new Set([...Object.keys(base), ...Object.keys(desired)])) {
            if (equal(base[key], desired[key])) continue;
            if (!equal(remote[key], base[key]) && !equal(remote[key], desired[key])) throw conflict(path + '/' + key);
            if (desired[key] === undefined) delete result[key];
            else result[key] = desired[key];
        }
        return result;
    }
    const api = { clean, equal, merge };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.DunamisSync = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
