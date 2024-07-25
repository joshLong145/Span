import { assertEquals } from "https://deno.land/std@0.210.0/assert/mod.ts";

import { Pool } from "../src/Pool.ts";

Deno.test("Pool should initalize with correct worker count", async () => {
  const poolSize = 10;
  const pool = new Pool({ workerCount: poolSize });
  await pool.init("console.log('hello world from pool test');");
  assertEquals(pool.threads.length, poolSize);

  for (let i = 0; i < pool.threads.length; i++) {
    assertEquals(pool.threads[i].isReady(), true);
  }

  const states = pool.getThreadStates();
  assertEquals(states.length, poolSize);

  pool.terminate();
});
