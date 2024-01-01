import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.210.0/assert/mod.ts";

import { WasmInstanceWrapper } from "../src/mod.ts";
import { WasmWorkerDefinition } from "../src/WasmInstanceWrapper.ts";
import { sleep } from "https://deno.land/x/sleep/mod.ts";

class GoTestExample extends WasmWorkerDefinition {
  public constructor(modulePath: string) {
    super(modulePath);
  }

  public testBuffer(
    buffer: SharedArrayBuffer,
    args: Record<string, any>,
  ): SharedArrayBuffer {
    let arr = new Int8Array(buffer);
    arr[0] += 1;
    //@ts-ignore wasm
    self.primeGenerator();

    return buffer;
  }

  public testParams(
    buffer: SharedArrayBuffer,
    args: Record<string, any>,
  ): SharedArrayBuffer {
    let arr = new Int32Array(buffer);
    arr[0] = args.foo;
    return buffer;
  }
}
class RustTestExample extends WasmWorkerDefinition {
  public constructor(modulePath: string) {
    super(modulePath);
  }

  public test2(buffer: SharedArrayBuffer, args: Record<string, any>) {
    let arr = new Int8Array(buffer);
    arr[0] += 1;
    //@ts-ignore
    self.greet();
    return arr.buffer;
  }
}

Deno.test("WASM Worker Should have wasm methods loaded from module", async () => {
  const example: GoTestExample = new GoTestExample(
    "./examples/wasm/tiny-go/primes-2.wasm",
  );

  const wrapper: WasmInstanceWrapper<GoTestExample> = new WasmInstanceWrapper<
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
  const example: GoTestExample = new GoTestExample(
    "./examples/wasm/tiny-go/primes-2.wasm",
  );

  const wrapper: WasmInstanceWrapper<GoTestExample> = new WasmInstanceWrapper<
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

Deno.test("WASM Worker Should have wasm methods loaded from Rust compiled module", async () => {
  const example: RustTestExample = new RustTestExample(
    "./examples/wasm/rust/wasm_test_bg.wasm",
  );

  const wrapper: WasmInstanceWrapper<RustTestExample> = new WasmInstanceWrapper<
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
      moduleLoader: (path: string) => {
        const fd = Deno.openSync(path);
        let source = Deno.readAllSync(fd);
        fd.close();
        return source;
      },
    },
  );

  await wrapper.start();
  await example.execute("test2").then((buffer: SharedArrayBuffer) => {
    console.log(new Uint8Array(buffer)[0]);
  });
  example.terminateWorker();
});
