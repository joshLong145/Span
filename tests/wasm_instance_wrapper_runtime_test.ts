import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.210.0/assert/mod.ts";

import { InstanceWrapper, WorkerDefinition } from "../src/mod.ts";
import { WorkerAny } from "../src/types.ts";

class GoTestExample extends WorkerDefinition {
  public constructor() {
    super();
  }

  testBuffer = (
    buffer: SharedArrayBuffer,
    _args: Record<string, any>,
  ): SharedArrayBuffer => {
    const arr = new Int8Array(buffer);
    arr[0] += 1;
    //@ts-ignore wasm module function
    self.primeGenerator();

    return buffer;
  };

  testParams = (
    buffer: SharedArrayBuffer,
    args: WorkerAny,
  ): SharedArrayBuffer => {
    const arr = new Int32Array(buffer);
    arr[0] = args.foo as number;
    return buffer;
  };

  testAsync = async (
    buffer: SharedArrayBuffer,
    _args: WorkerAny,
  ): Promise<SharedArrayBuffer> => {
    const prms: Promise<void> = new Promise((res, _rej) => {
      const a = 2 + 2;
      res();
    });
    await prms;
    return buffer;
  };
}

class RustTestExample extends WorkerDefinition {
  public constructor() {
    super();
  }

  test2 = (buffer: SharedArrayBuffer, args: Record<string, any>) => {
    const arr = new Int8Array(buffer);
    arr[0] += 1;
    //@ts-ignore was module function
    self.greet();

    //@ts-ignore wasm module function
    const val = self.getValue();

    arr[0] += 1;
    return arr.buffer;
  };
}

Deno.test("WASM Worker Should have wasm methods loaded from GoLang module", async () => {
  const example: GoTestExample = new GoTestExample();

  const wrapper: InstanceWrapper<GoTestExample> = new InstanceWrapper<
    GoTestExample
  >(
    example,
    {
      addons: [
        "./lib/wasm_exec_tiny.js",
      ],
      addonLoader: (path: string) => {
        return Deno.readTextFileSync(path);
      },
      modulePath: "./examples/wasm/tiny-go/primes-2.wasm",
      moduleLoader: (path: string) => {
        const fd = Deno.openSync(path);
        const mod = Deno.readAllSync(fd);
        fd.close();
        return mod;
      },
      workerCount: 5,
    },
  );

  await wrapper.start();

  await example.execute("testBuffer", {}).promise.then(
    (buf: SharedArrayBuffer) => {
      assertEquals(new Uint32Array(buf)[0], 1);
    },
  );
  await example.execute("testBuffer", {}).promise.then(
    (buf: SharedArrayBuffer) => {
      assertEquals(new Uint32Array(buf)[0], 2);
    },
  );

  await example.execute("testParams", { foo: "bar" }).promise.then(
    (buf: SharedArrayBuffer) => {
      assertExists(new Uint32Array(buf)[0]);
      example.terminateWorker();
    },
  );
});

Deno.test("WASM Worker method should correct pass arguments", async () => {
  const example: GoTestExample = new GoTestExample();

  const wrapper: InstanceWrapper<GoTestExample> = new InstanceWrapper<
    GoTestExample
  >(
    example,
    {
      addons: [
        "./lib/wasm_exec_tiny.js",
      ],
      addonLoader: (path: string) => {
        return Deno.readTextFileSync(path);
      },
      modulePath: "./examples/wasm/tiny-go/primes-2.wasm",
      moduleLoader: (path: string) => {
        const fd = Deno.openSync(path);
        let mod = Deno.readAllSync(fd);
        fd.close();
        return mod;
      },
      workerCount: 5,
    },
  );

  await wrapper.start();

  await example.execute("testParams", { foo: "bar" }).promise.then(
    (buf: SharedArrayBuffer) => {
      assertExists(new Uint32Array(buf)[0]);
      example.terminateWorker();
    },
  );
  example.terminateWorker();
});

Deno.test("WASM Worker Should have wasm methods loaded from Rust compiled module", async () => {
  const example: RustTestExample = new RustTestExample();

  const wrapper: InstanceWrapper<RustTestExample> = new InstanceWrapper<
    RustTestExample
  >(
    example,
    {
      addons: [
        "./lib/wasm_test.js",
      ],
      addonLoader: (path: string) => {
        return Deno.readTextFileSync(path);
      },
      modulePath: "./examples/wasm/rust/wasm_test_bg.wasm",
      moduleLoader: (path: string) => {
        const fd = Deno.openSync(path);
        let source = Deno.readAllSync(fd);
        fd.close();
        return source;
      },
      workerCount: 5,
    },
  );

  await wrapper.start();
  await example.execute("test2", {}).promise.then(
    (buffer: SharedArrayBuffer) => {
      assertExists(new Uint32Array(buffer)[0]);
    },
  );
  example.terminateWorker();
});
