import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.210.0/assert/mod.ts";
import { InstanceWrapper, WorkerDefinition } from "../src/mod.ts";

class TestExample extends WorkerDefinition {
  public constructor() {
    super();
  }

  foo = (
    buffer: SharedArrayBuffer,
    _args: Record<string, any>,
  ): ArrayBuffer => {
    const arr = new Int8Array(buffer);
    arr[0] += 1;

    return buffer;
  };

  bar = (
    buffer: SharedArrayBuffer,
    args: Record<string, any>,
  ): SharedArrayBuffer => {
    const _arr = new Uint8Array(buffer)[0] = args.value;

    return buffer;
  };

  testAsync = async (
    buffer: SharedArrayBuffer,
    _args: Record<string, any>,
  ): Promise<SharedArrayBuffer> => {
    const prms: Promise<void> = new Promise((res, _rej) => {
      const a = 2 + 2;
      console.log("a value is ", a);
      console.log("deno api", Deno);
      res();
    });
    await prms;
    return buffer;
  };
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

  await inst.execute("testAsync");

  inst.terminateWorker();
});

Deno.test("Worker Wrapper manager should respect argument value in buffer when returned", async () => {
  const inst = new TestExample();
  const wrapper = new InstanceWrapper<TestExample>(inst, {});

  await wrapper.start();
  await inst.execute("bar", { value: 10 }).then((buf) => {
    assertEquals(new Uint32Array(buf)[0], 10);
  });

  inst.terminateWorker();
});
