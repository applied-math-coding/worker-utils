import { createWorker, Fn, WORKER, WithWorker } from './worker.utils';

class Task<T extends Fn = Fn>{
  id: number;
  fn: T | string;
  context: (Fn | string)[];
  args?: Parameters<T> | undefined;
  transfer: Transferable[];
  resolve: (r: ReturnType<T>) => void;
  reject: (e: any) => void;

  constructor({ id, fn, args, context = [], transfer = [], resolve, reject }:
    {
      id: number,
      fn: T | string,
      args: Parameters<T> | undefined,
      transfer: Transferable[],
      context?: (Fn | string)[],
      resolve: (r: ReturnType<T>) => void,
      reject: (e: any) => void
    }) {
    this.id = id;
    this.fn = fn;
    this.args = args;
    this.transfer = transfer;
    this.context = context;
    this.resolve = resolve;
    this.reject = reject;
  }
}

export default class WorkerPool {
  private uid = 0;
  private maxWorkers: number;
  private scheduled: Task[] = [];
  private running: Map<number, Worker> = new Map();

  constructor(maxWorkers?: number) {
    this.maxWorkers = maxWorkers || window.navigator.hardwareConcurrency;
  }

  private checkToRunTask() {
    while (this.scheduled.length > 0 && this.running.size < this.maxWorkers) {
      const task = this.scheduled.shift() as Task;
      const worker = createWorker(
        { fn: task.fn, context: task.context, transfer: task.transfer }
      )(...(task.args as any));
      this.running.set(task.id, (worker as WithWorker)[WORKER] as Worker);
      worker
        .then(r => task.resolve(r))
        .catch(e => task.reject(e))
        .finally(() => this.handleTaskFinished(task.id));
    }
  }

  private handleTaskFinished(id: number) {
    this.running.delete(id);
    this.checkToRunTask();
  }

  private createTaskId(): number {
    this.uid = this.uid + 1;
    return this.uid;
  }

  addTask<T extends Fn>({ fn, args, context = [], transfer = [] }:
    { fn: T | string, args?: Parameters<T>, context?: (Fn | string)[], transfer?: Transferable[] }
  ): { id: number, result: Promise<ReturnType<T>> } {
    const id = this.createTaskId();
    return {
      id,
      result: new Promise<ReturnType<T>>((resolve, reject) => {
        this.scheduled.push(new Task({ id, fn, args, transfer, context, resolve, reject }));
        this.checkToRunTask()
      })
    };
  }

  terminateTask(id: number) {
    if (this.scheduled.find(t => t.id === id)) {
      this.scheduled = this.scheduled.filter(t => t.id !== id);
    } else if (this.running.has(id)) {
      (this.running.get(id) as Worker).terminate();
      this.handleTaskFinished(id);
    }
  }

  terminateAllTasks() {
    this.scheduled = [];
    for (let id of this.running.keys()) {
      this.terminateTask(id);
    }
  }
}
