import { createMutex, createSharedView, createWorker, terminateWorker } from './worker.utils';

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

describe('worker using subscription', function () {
  it('should run without exception', async function () {
    const promises = [1, 2].map(() => new Promise<void>(
      resolve => createWorker({
        fn: () => {
          for (let idx = 0; idx < 10; idx++) {
            postMessage(idx);
          }
        },
        subscription: d => {
          console.log(d);
          (d === 9) && resolve();
        }
      })()
    ));
    await Promise.all(promises);
  });
});

