import { WorkerPool } from './worker-pool';

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