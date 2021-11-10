import { createMutex, createSharedView, createWorker, lock, terminateWorker, unlock } from '../src/worker.utils';
import WorkerPool from '../src/worker-pool';

describe('basic test', function () {
  it('should be 3', async function () {
    const r = await createWorker({
      fn: (a: number, b: number) => a + b
    })(1, 2);
    expect(r).toEqual(3);
  });
});

// describe('mutex test', function () {
//   it('should be 3', async function () {
//     const mutex = createMutex();
//     const r = await createWorker({
//       fn: (a: number, b: number, mut: Int32Array) => {
//         lock(mut);
//         const result = a + b;
//         unlock(mut);
//         return result;
//       }
//     })(1, 2, mutex);
//     expect(r).toEqual(3);
//   });
// }); fails because of compiler/bundler

describe('fn as string', function () {
  it('should be 3', async function () {
    const mutex = createMutex();
    const r = await createWorker<(a: number, b: number, mut: Int32Array) => number>({
      fn: `(a, b, mut) => {
        lock(mut);
        const result = a + b;
        unlock(mut);
        return result;
      }`
    })(1, 2, mutex);
    expect(r).toEqual(3);
  });
});

describe('terminate worker', function () {
  it('should terminate', async function () {
    const w = createWorker<(a: number) => number>({
      fn: `a => new Promise(resolve => setTimeout(resolve, a))`
    });
    w(10000);
    terminateWorker(w);
  });
});

describe('worker with context', function () {
  it('should be 3', async function () {
    function add(a: number, b: number) {
      return a + b;
    }
    const r = await createWorker({
      fn: () => add(1, 2),
      context: [add]
    })();
    expect(r).toEqual(3);
  });
});

describe('worker with transferred data', function () {
  it('should be 3', async function () {
    const data = Float64Array.from([1]);
    const r = await createWorker({
      fn: (d: Float64Array) => d[0] + 2,
      transfer: [data.buffer]
    })(data);
    expect(r).toEqual(3);
  });
});

describe('worker using shared-data', function () {
  it('should be 1', async function () {
    const sharedData = createSharedView([0], Int32Array);
    const r = await createWorker({
      fn: (d: Int32Array) => {
        Atomics.store(d, 0, 1);
      }
    })(sharedData);
    expect(sharedData[0]).toEqual(1);
  });
});

describe('worker pool', function () {
  it('should be 1', async function () {
    const pool = new WorkerPool();
    const results = await Promise.all(
      Array(50)
        .fill(null)
        .map(
          () =>
            pool.addTask({
              fn: (a: number) => {
                let s = 0;
                for (let i = 0; i < a; i++) {
                  s = s + 1;
                }
                return s;
              },
              args: [10],
            }).result
        )
    );
    expect(results).toEqual(Array(50).fill(10));
  });
});

describe('worker pool with strings', function () {
  it('should be 1', async function () {
    const pool = new WorkerPool();
    const results = await Promise.all(
      Array(50)
        .fill(null)
        .map(
          () =>
            pool.addTask({
              fn: `a => {
                let s = 0;
                for (let i = 0; i < a; i++) {
                  s = s + 1;
                }
                return s;
              }`,
              args: [10],
            }).result
        )
    );
    expect(results).toEqual(Array(50).fill(10));
  });
});








