export type Fn = (...args: any[]) => any;
export type ToAsync<T extends Fn> = (...args: Parameters<T>) => Promise<ReturnType<T>>;
export const WORKER = Symbol();
export type WithWorker = { [WORKER]?: Worker };
export type WorkerExec<T extends Fn> = ToAsync<T> & WithWorker;
export type TypedArrayConstructor = Int32ArrayConstructor | Float64ArrayConstructor;
export type TypedArray<T extends TypedArrayConstructor> = T extends Int32ArrayConstructor ? Int32Array : Float64Array;

export const createWorker = <T extends Fn>({ fn, context = [], transfer = [], subscription }: {
  fn: T | string,
  context?: (Fn | string)[],
  transfer?: Transferable[],
  subscription?: (d: any) => void
}): WorkerExec<T> => {
  const b = new Blob([createWorkerSetup(fn, context)], { type: 'text/javascript' });
  const url = URL.createObjectURL(b);
  const w = new Worker(url);
  URL.revokeObjectURL(url);
  const f = function (...args: Parameters<T>): Promise<ReturnType<T>> {
    queueMicrotask(() => w.postMessage(args, transfer)); // must run after promise is set!
    return new Promise<ReturnType<T>>((res, rej) => {
      w.onmessage = ({ data }) => {
        subscription?.(data);
        res(data);
      };
      w.onerror = rej;
    });
  } as ToAsync<T> & WithWorker;
  f[WORKER] = w;
  return f;
}

export function terminateWorker(f: WithWorker) {
  f[WORKER]?.terminate();
}

function createWorkerSetup(fn: Fn | string, context: (Fn | string)[]): string {
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
export function split(n: number, steps: number): number[][] {
  const p = Math.floor(n / steps);
  const res: number[][] = [];
  for (let s = 0; s < steps; s++) {
    res[s] = [];
    for (let i = s * p; i < ((s === steps - 1) ? (n + 1) : (s + 1) * p); i++) {
      res[s][i] = i;
    }
  }
  return res;
}

export function createSharedView<T extends TypedArrayConstructor>(data: Iterable<number>, Constructor: T): TypedArray<T> {
  const view = Constructor.from(data);
  const sharedBuffer = new SharedArrayBuffer(view.buffer.byteLength);
  const sharedView = new Constructor(sharedBuffer);
  sharedView.set(view);
  return sharedView as TypedArray<T>;
}

export function createMutex(): Int32Array {
  return createSharedView([0], Int32Array);
}

export function lock(mutex: Int32Array) {
  const [locked, unlocked] = [1, 0];
  while (true) {
    if (Atomics.compareExchange(mutex, 0, unlocked, locked) === locked) {
      // previous value was 'locked' so replacement didn't take place
      Atomics.wait(mutex, 0, locked); // wait as long mutex gets value 'locked'
    } else {
      // replacement was performed by this thread
      break;
    }
  }
}

function lockAsString(): string {
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

function unlockAsString(): string {
  return `
  function unlock(mutex) {
    const unlocked = 0;
    Atomics.store(mutex, 0, unlocked);
    Atomics.notify(mutex, 0, 1);
  }
  `;
}

export function unlock(mutex: Int32Array) {
  const unlocked = 0;
  Atomics.store(mutex, 0, unlocked); // unlock
  Atomics.notify(mutex, 0, 1); // notify exactly the next in waiting-queue
}
