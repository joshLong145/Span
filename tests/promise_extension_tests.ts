import { assertEquals } from "https://deno.land/std@0.210.0/assert/mod.ts";
import { InstanceWrapper, WorkerDefinition } from "../src/mod.ts";
import { assertExists } from "https://deno.land/std@0.210.0/assert/assert_exists.ts";

class TestExample extends WorkerDefinition {
  public constructor() {
    super();
  }
  longRun = (
    buffer: SharedArrayBuffer,
    module: Record<string, any>,
  ): Promise<SharedArrayBuffer> => {
    return new Promise((res) => setTimeout(res, 10000));
  };
  foo = (
    buffer: SharedArrayBuffer,
    module: Record<string, any>,
  ): SharedArrayBuffer => {
    let arr = new Uint8Array(buffer);
    arr[0] += 1;
    return buffer;
  };

  forever = (
    buffer: SharedArrayBuffer,
    module: Record<string, any>,
  ): SharedArrayBuffer => {
    while (true) {}
  };
}

Deno.test("Promise should reject and throw error on timeout", async () => {
  const inst = new TestExample();
  const wrapper = new InstanceWrapper<TestExample>(inst, {
    workerCount: 5,
    taskCount: 2,
  });
  await wrapper.start();
  try {
    const promise = inst.execute("longRun", {});
    promise.timeout(100);
    await new Promise((res) => setTimeout(res, 100));
    await promise;
  } catch (err: unknown) {
    assertEquals(typeof err, "object");
    assertEquals(
      (err as Error).message,
      "Timeout has occured, aborting worker execution",
    );
  } finally {
    console.log(inst.pool?.getThreadStates());
    await inst.terminateWorker();
  }
});

Deno.test("Promise should resolve and return array buffer", async () => {
  const inst = new TestExample();
  const wrapper = new InstanceWrapper<TestExample>(inst, {
    workerCount: 5,
    taskCount: 2,
  });
  await wrapper.start();
  let promise = inst.execute("foo", {});
  const buf = await promise;

  assertEquals(typeof buf, "object");
  assertExists(buf.byteLength);
  await inst.terminateWorker();
});

Deno.test("Promise should reject and throw error on timeout when infinite loop occures", async () => {
  const inst = new TestExample();
  const wrapper = new InstanceWrapper<TestExample>(inst, {
    workerCount: 5,
    taskCount: 2,
  });
  await wrapper.start();
  try {
    const promise = inst.execute("forever", {});
    promise.timeout(100);

    await promise;
  } catch (err: unknown) {
    assertEquals(typeof err, "object");
    assertEquals(
      (err as Error).message,
      "Worker terminated",
    );
  } finally {
    await inst.terminateWorker();
  }
});
