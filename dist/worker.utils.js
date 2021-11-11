"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unlock = exports.lock = exports.createMutex = exports.createSharedView = exports.split = exports.terminateWorker = exports.createWorker = exports.WORKER = void 0;
exports.WORKER = Symbol();
const createWorker = ({ fn, context = [], transfer = [] }) => {
    const b = new Blob([createWorkerSetup(fn, context)], { type: 'text/javascript' });
    const url = URL.createObjectURL(b);
    const w = new Worker(url);
    const f = function (...args) {
        queueMicrotask(() => w.postMessage(args, transfer)); // must run after promise is set!
        return new Promise((res, rej) => {
            w.onmessage = ({ data }) => {
                res(data);
                URL.revokeObjectURL(url);
            };
            w.onerror = rej;
        });
    };
    f[exports.WORKER] = w;
    return f;
};
exports.createWorker = createWorker;
function terminateWorker(f) {
    var _a;
    (_a = f[exports.WORKER]) === null || _a === void 0 ? void 0 : _a.terminate();
}
exports.terminateWorker = terminateWorker;
function createWorkerSetup(fn, context) {
    const fnDeclarations = [...context]
        .map(f => `${f.toString()}`)
        .join('\n');
    return `
      onmessage = async ({data}) => {
        ${fnDeclarations}
        ${lockAsString()}
        ${unlockAsString()}
        const result = await (${fn})(...data);
        postMessage(result);
      };
  `;
}
// Splits a given integer into steps interval. The last interval collecting the remainder.
function split(n, steps) {
    const p = Math.floor(n / steps);
    const res = [];
    for (let s = 0; s < steps; s++) {
        res[s] = [];
        for (let i = s * p; i < ((s === steps - 1) ? (n + 1) : (s + 1) * p); i++) {
            res[s][i] = i;
        }
    }
    return res;
}
exports.split = split;
function createSharedView(data, Constructor) {
    const view = Constructor.from(data);
    const sharedBuffer = new SharedArrayBuffer(view.buffer.byteLength);
    const sharedView = new Constructor(sharedBuffer);
    sharedView.set(view);
    return sharedView;
}
exports.createSharedView = createSharedView;
function createMutex() {
    return createSharedView([0], Int32Array);
}
exports.createMutex = createMutex;
function lock(mutex) {
    const [locked, unlocked] = [1, 0];
    while (true) {
        if (Atomics.compareExchange(mutex, 0, unlocked, locked) === locked) {
            // previous value was 'locked' so replacement didn't take place
            Atomics.wait(mutex, 0, locked); // wait as long mutex gets value 'locked'
        }
        else {
            // replacement was performed by this thread
            break;
        }
    }
}
exports.lock = lock;
function lockAsString() {
    return `
  function lock(mutex) {
    const [locked, unlocked] = [1, 0];
    while (true) {
      if (Atomics.compareExchange(mutex, 0, unlocked, locked) === locked) {
        Atomics.wait(mutex, 0, locked);
      } else {
        break;
      }
    }
  }
  `;
}
function unlockAsString() {
    return `
  function unlock(mutex) {
    const unlocked = 0;
    Atomics.store(mutex, 0, unlocked);
    Atomics.notify(mutex, 0, 1);
  }
  `;
}
function unlock(mutex) {
    const unlocked = 0;
    Atomics.store(mutex, 0, unlocked); // unlock
    Atomics.notify(mutex, 0, 1); // notify exactly the next in waiting-queue
}
exports.unlock = unlock;
//# sourceMappingURL=worker.utils.js.map