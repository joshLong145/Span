import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.210.0/assert/mod.ts";

import { InstanceWrapper } from "../src/mod.ts";
import { WasmWorkerDefinition } from "../src/WasmInstanceWrapper.ts";

class GoTestExample extends WasmWorkerDefinition {
  public constructor(modulePath: string) {
    super(modulePath);
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
    args: Record<string, any>,
  ): SharedArrayBuffer => {
    const arr = new Int32Array(buffer);
    arr[0] = args.foo;
    return buffer;
  };

  testAsync = async (
    buffer: SharedArrayBuffer,
    _args: Record<string, any>,
  ): Promise<SharedArrayBuffer> => {
    const prms: Promise<void> = new Promise((res, _rej) => {
      const a = 2 + 2;
      console.log("a value is ", a);
      res();
    });
    await prms;
    return buffer;
  };
}
class RustTestExample extends WasmWorkerDefinition {
  public constructor(modulePath: string) {
    super(modulePath);
  }

  test2 = (buffer: SharedArrayBuffer, args: Record<string, any>) => {
    console.log(args.dom);
    const arr = new Int8Array(buffer);
    arr[0] += 1;
    //@ts-ignore was module function
    self.greet();
    //@ts-ignore wasm module function
    const val = self.getValue();
    console.log(val);
    return arr.buffer;
  };
}

Deno.test("WASM Worker Should have wasm methods loaded from GoLang module", async () => {
  const example: GoTestExample = new GoTestExample(
    "./examples/wasm/tiny-go/primes-2.wasm",
  );

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
    },
  );

  await wrapper.start();
  await example.execute("test2").then(
    (buffer: SharedArrayBuffer) => {
      console.log(new Uint8Array(buffer)[0]);
    },
  );
  example.terminateWorker();
});
