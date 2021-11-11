# worker-utils
A small package that intends to facilitate the use of <b>workers</b> in JavaScript.<br><br>
It supports the use of <b>ownership transferal</b>, <b>shared data</b> and <b>structured clones</b>.<br><br>
Moreover, it provides utilities like <b>mutex</b> for synchronization between worker-threads.<br><br>
No need to put parallel running code into its own file, all is done inline!<br><br>
Type declarations are included in the package to make it usable within a <b>TypeScript</b> project.

# Installation
$ npm i @applied.math.coding/worker-utils

# Usage
First of all, the library has full support for TypeScript. The build includes all type declarations.
The examples below will be written in TypeScript but do work for pure JavaScript as well by just removing the type annotations.

## Creating and running a worker:
```
import { createWorker } from '@applied.math.coding/worker-utils';
const w = createWorker({
  fn: (a: number, b: number) => a + b
});
console.log(await w(1, 2));
```
The function createWorker takes a function ```fn``` as argument and returns a new function ```w``` that has the same arguments as ```fn```.
The difference is, when you call ```w``` instead of returning the result of ```fn``` it returns a promise. This call triggers to run the function ```fn```
in a new Worker by getting passed the given arguments and then resolving the aforementioned promise.
## Terminating a worker:
You can terminate a worker from this library at any time in the following way:
```
import { createWorker,  terminateWorker} from '@applied.math.coding/worker-utils';
const w = createWorker<(a: number) => number>({
  fn: `a => new Promise(resolve => setTimeout(resolve, a))`
});
w(10000);
terminateWorker(w);
```
## Adding context to the worker:
Often it is the case that your function that you want having executed in parallel makes calls to other functions. 
This in general would fail because a worker runs totally isolated from the main thread. 
To solve this issue, you can add all functions by reference to a context that is provided to the worker:
```
import { createWorker } from '@applied.math.coding/worker-utils';
function add(a: number, b: number) {
  return a + b;
}
const r = await createWorker(
  fn: () => add(1, 2),
  context: [add]
})();
```
<b>Important note: Variables defined outside the function ```fn``` won't be visible to the worker. You must provide them as arguments of your function ```fn```.</b>
## Transferring data by ownership:
When dealing with large data, we want to avoid copy operations as much as possible.
Usually data passed to a worker are copied (structured clone) but for certain types the transferal of ownership is allowed instead:
```
import { createWorker } from '@applied.math.coding/worker-utils';
const data = Float64Array.from([1]);
const r = await createWorker({
  fn: (d: Float64Array) => d[0] + 2,
  transfer: [data.buffer]
})(data);
```
All JavaScript's typed-arrays are transferable in that way, but remember to transport the ArrayBuffer of your DataView.
## Using shared data:
Sometimes it is necessary that several in parallel running processes do see the same shared data. 
When doing this kind of concurrent access, important to remember is to read/write this data by using JavaScript's atomic operations.
The library supports to create and use shared-data as follows:
```
import { createWorker, createSharedView } from '@applied.math.coding/worker-utils';
const sharedData = createSharedView([0], Int32Array);
const r = await createWorker({
  fn: (d: Int32Array) => Atomis.store(d, 0, 1)
})(sharedData);
console.log(sharedData[0]); // 1
```
The ```createSharedView``` expects the corresponding TypeArray-constructor as second argument. 
After this, the array given in the first argument is getting copied into a SharedArrayBuffer.
<br><b>When using anything around shared-data ensure the server to have the following response headers added:</b>
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```
## Mutex-synchronization:
Sometimes when dealing with concurrent access on shared-data by multiple threads, atomic operations are not enough. 
In such cases we need to ensure a specific part of the code can only be run by at most one thread at a time. This can be achieved like so:
```
import { createWorker, createMutex, lock, unlock} from '@applied.math.coding/worker-utils';
const mutex = createMutex();
const r = await createWorker({
  fn: (a: number, b: number, mut: Int32Array) => {
     lock(mut);
     const result = a + b;
     unlock(mut);
     return result;
  }
})(1, 2, mutex);
```
Just create a mutex by use of ```createMutex``` and share this object across your workers by passing it as argument.
Inside the function ```fn```, you may use the provided methods ```lock``` and ```unlock```.
Both require the mutex as argument on that the synchronization shall take place.
This way, only one thread is able to execute the code that is between ```lock``` and ```unlock```.
## Coping with code optimizers:
Even if your are using pure JavaScript chances are high that your project uses a code optimizer (webpack-bundler, uglifier, …). 
In such cases, the above examples may fail. The reason for this is that such tools often change the code by adding new global variables. 
These variables are not visible to the worker's scope and so the code will fail.
For this the libraries offers to supply the function ```fn``` and possible context-functions as string:
```
import { createWorker, createMutex } from '@applied.math.coding/worker-utils';
const mutex = createMutex();
const r = await 
createWorker<(a: number, b: number, mut: Int32Array)  => number>({
      fn: `(a, b, mut) => {
        lock(mut);
        const result = a + b;
        unlock(mut);
        return result;
      }`
    })(1, 2, mutex);
```
Observe, the function ```fn``` has now to be written in pure JavaScript and ```createWorker``` can be supplied with 
a generic type annotation that describes ```fn``` at a type level. This ensures all other parts stay fully typed.
## Using a pool of workers:
In the situation of having many tasks that shall run in parallel one usually restricts its number to a  reasonable amount. 
This mechanism is provided by a thread-pool. Task can be created and added to the pool, but the pool decides when to run them. 
The pools ensures the number of parallel running processes to not surpass a given threshold.
You create a worker-pool with maximal ```x``` workers running in parallel by doing:
```
const pool = new WorkerPool(x);
```
```x``` is optional and falls back to the number of physical cores.
The ```WorkerPool``` provides the methods:
```
addTask(task)  // returns:  {id, result}
terminateTask(id)
terminateAllTasks()
```
A task is presented by the following type:
```
Task{
 fn: string or function
 args: parameters the function to be called
 transfer: possible transferable objects (ArrayBuffer)
 context: a list of functions
}
```
The meanings  of all these properties are the same as for those of ```createWorker```.
An example is given by the following. It add ```50``` tasks to a ```WorkerPool``` and waits by using ```Promise.all``` on all to be finished. Then it logs the result.
```
import { createWorker, WorkerPool } from '@applied.math.coding/worker-utils';
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
console.log(results);
```
The ```addTask``` returns an object that contains the task's id and result which is a promise. The latter is resolved when the task has been executed by the ```WorkerPool```.
