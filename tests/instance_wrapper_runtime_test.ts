import {
  assertEquals,
  assertIsError,
  assertRejects,
} from "https://deno.land/std@0.210.0/assert/mod.ts";
import { InstanceWrapper, ThreadState, WorkerDefinition } from "../src/mod.ts";

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
      res();
    });
    await prms;
    return buffer;
  };

  testErrorCatch = (
    buffer: SharedArrayBuffer,
    args: Record<string, any>,
  ): SharedArrayBuffer => {
    //@ts-ignore testing error handling;
    args.foo.bar();
    return buffer;
  };


  testInfiniteLoop = (
    buffer: SharedArrayBuffer,
    _args: Record<string, any>,
  ): SharedArrayBuffer => {
    while (true) {}
    return buffer;
  };
}

Deno.test("Worker Wrapper manager should respect buffer when returned", async () => {
  const inst = new TestExample();
  const wrapper = new InstanceWrapper<TestExample>(inst, { workerCount: 5 });

  await wrapper.start();

  await inst.execute("foo", {}).promise.then((buf) => {
    assertEquals(new Uint32Array(buf!)[0], 1);
  });

  await inst.execute("foo", {}).promise.then((buf) => {
    assertEquals(new Uint32Array(buf!)[0], 2);
  });

  await inst.execute("testAsync", {}).promise;

  await assertRejects(
    () => {
      const workerPrms = inst.execute("testInfiniteLoop", {});

      //@ts-ignore need to add types
      workerPrms.timeout(1_000);
      return workerPrms.promise.finally(() => {
        assertEquals(workerPrms.settledCount, 1);
      });
    },
    Error,
    "Timeout has occured, aborting worker execution",
  );

  inst.terminateWorker();
});

Deno.test("Worker Wrapper manager should respect argument value in buffer when returned", async () => {
  const inst = new TestExample();
  const wrapper = new InstanceWrapper<TestExample>(inst, { workerCount: 5 });

  await wrapper.start();
  await inst.execute("bar", { value: 10 }).promise.then((buf) => {
    assertEquals(new Uint32Array(buf!)[0], 10);
  });

  inst.terminateWorker();
});

Deno.test("Worker Wrapper Generated Promise should handle rejections", async () => {
  const inst = new TestExample();
  const wrapper = new InstanceWrapper<TestExample>(inst, { workerCount: 5 });

  await wrapper.start();
  await inst.execute("testErrorCatch", {}).promise.catch((err) => {
    assertIsError(err);
  });
  inst.terminateWorker();
});



Deno.test("Pooling should correctly route requests to workers with buffer allowance", async () => {
  const inst = new TestExample();
  const wrapper = new InstanceWrapper<TestExample>(inst, { workerCount: 5, taskCount: 2 });

  await wrapper.start();
  const promises = [];
  for (let i = 0; i < 6; i++) {
    promises.push(inst.execute("testAsync", {}).promise);
  }
  
  assertEquals(promises.length, 6);
  console.log(inst.pool?.getThreadStates());
  console.log(inst.pool?.getThreadStates());

  for (let i = 0; i < inst.pool?.getThreadStates().length!; i++) {
    if (i <= Math.ceil( 5 / 2) - 1) {
      assertEquals(inst.pool?.getThreadStates()[i].tasks.length, 2);
    } else {
      assertEquals(inst.pool?.getThreadStates()[i].tasks.length, 0);
    }
  }

  await Promise.all(promises);
  for (let i = 0; i < inst.pool?.getThreadStates().length!; i++) {
      assertEquals(inst.pool?.getThreadStates()[i].tasks.length, 0);
  }

  await inst.terminateWorker();
});