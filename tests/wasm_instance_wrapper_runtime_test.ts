import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.210.0/assert/mod.ts";

import { WasmInstanceWrapper } from "../src/mod.ts";
import { WasmWorkerDefinition } from "../src/WasmInstanceWrapper.ts";
import { sleep } from "https://deno.land/x/sleep/mod.ts";

class TestExample extends WasmWorkerDefinition {
  public constructor(modulePath: string) {
    super(modulePath);
  }

  public testBuffer(buffer: SharedArrayBuffer, module: Record<string, any>) {
    let arr = new Int8Array(buffer);
    arr[0] += 1;
    //@ts-ignore wasm
    self.primeGenerator();
  }

  public testParams(buffer: SharedArrayBuffer, module: Record<string, any>) {
    let arr = new Int32Array(buffer);
    arr[0] = module.foo;
  }
}

Deno.test("WASM Worker Should have wasm methods loaded from module", async () => {
  const example: TestExample = new TestExample(
    "./examples/wasm/tiny-go/primes-2.wasm",
  );

  const wrapper: WasmInstanceWrapper<TestExample> = new WasmInstanceWrapper<
    TestExample
  >(
    example,
    {
      addons: [
        "./lib/wasm_exec_tiny.js",
      ],
      addonLoader: (path: string) => {
        return Deno.readTextFileSync(path);
      },
      moduleLoader: (path: string) => {
        const fd = Deno.openSync(path);
        let mod = Deno.readAllSync(fd);
        fd.close();
        return mod;
      },
    },
  );

  await wrapper.start();

  await example.execute("testBuffer").then((buf: SharedArrayBuffer) => {
    assertEquals(new Uint32Array(buf)[0], 1);
  });
  await example.execute("testBuffer").then((buf: SharedArrayBuffer) => {
    assertEquals(new Uint32Array(buf)[0], 2);
  });

  await example.execute("testParams", { foo: "bar" }).then(
    (buf: SharedArrayBuffer) => {
      assertExists(new Uint32Array(buf)[0]);
      example.terminateWorker();
    },
  );
});

Deno.test("WASM Worker method should correct pass arguments", async () => {
  const example: TestExample = new TestExample(
    "./examples/wasm/tiny-go/primes-2.wasm",
  );

  const wrapper: WasmInstanceWrapper<TestExample> = new WasmInstanceWrapper<
    TestExample
  >(
    example,
    {
      addons: [
        "./lib/wasm_exec_tiny.js",
      ],
      addonLoader: (path: string) => {
        return Deno.readTextFileSync(path);
      },
      moduleLoader: (path: string) => {
        const fd = Deno.openSync(path);
        let mod = Deno.readAllSync(fd);
        fd.close();
        return mod;
      },
    },
  );

  await wrapper.start();

  await example.execute("testParams", { foo: "bar" }).then(
    (buf: SharedArrayBuffer) => {
      assertExists(new Uint32Array(buf)[0]);
      example.terminateWorker();
    },
  );
  example.terminateWorker();
});
