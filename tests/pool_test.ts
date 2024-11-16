import { assertEquals } from "https://deno.land/std@0.210.0/assert/mod.ts";

import { Pool } from "../src/Pool.ts";

Deno.test("Pool should initalize with correct worker count", async () => {
  const poolSize = 10;
  const pool = new Pool({ workerCount: poolSize, taskCount: 10 });
  await pool.init("//comment\nlet i = 0;");
  assertEquals(pool.threads.length, poolSize);

  for (let i = 0; i < pool.threads.length; i++) {
    assertEquals(pool.threads[i].isReady(), true);
  }

  const states = pool.getThreadStates();
  assertEquals(states.length, poolSize);

  pool.terminate();
});

Deno.test("Pool.removeWorker should remove correct worker and terminate", async () => {
  const poolSize = 10;
  const pool = new Pool({ workerCount: poolSize, taskCount: 10 });
  await pool.init("//comment\nlet i = 0;");
  const workerId = pool.threads[0].id;
  pool.removeWorker(workerId);
  assertEquals(pool.threads.length, poolSize - 1);
  const worker = pool.threads.find((w) => {
    return w.id === workerId;
  });
  assertEquals(worker, undefined);
  pool.terminate();
});
