import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.210.0/assert/mod.ts";
import { InstanceWrapper, WorkerDefinition } from "../src/mod.ts";

class TestExample extends WorkerDefinition {
  public constructor() {
    super();
  }

  public foo(
    buffer: SharedArrayBuffer,
    module: Record<string, any>,
  ): ArrayBuffer {
    const arr = new Int8Array(buffer);
    arr[0] += 1;

    return buffer;
  }
}

Deno.test("Worker Wrapper manager should respect buffer when returned", async () => {
  const inst = new TestExample();
  const wrapper = new InstanceWrapper<TestExample>(inst, {});

  await wrapper.start();

  await inst.execute("foo").then((buf) => {
    assertEquals(new Uint32Array(buf)[0], 1);
  });

  await inst.execute("foo").then((buf) => {
    assertEquals(new Uint32Array(buf)[0], 2);
  });

  inst.terminateWorker();
});
