//@ts-nocheck

import {
  WasmInstanceWrapper,
  WasmWorkerDefinition,
} from "../src/WasmInstanceWrapper.ts";

class TestExample extends WasmWorkerDefinition {
  public constructor(modulePath: string) {
    super(modulePath);
  }

  test2 = (
    buffer: SharedArrayBuffer,
    _module: Record<string, any>,
  ): SharedArrayBuffer => {
    const arr = new Int8Array(buffer);
    arr[0] += 1;

    self.primeGenerator();
    return arr.buffer;
  };
}

Deno.bench("Wasm Worker Start Go Module loading", async (_b) => {
  const example: WasmWorkerDefinition = new TestExample(
    "./examples/wasm/tiny-go/primes-2.wasm",
  );

  const wrapper: WasmInstanceWrapper<TestExample> = new WasmInstanceWrapper<
    Example
  >(
    example,
    {
      outputPath: "output",
      namespace: "testing",
      addons: [
        "./lib/wasm_exec_tiny.js",
      ],
      addonLoader: (path: string) => {
        return Deno.readTextFileSync(path);
      },
      moduleLoader: (path: string) => {
        const fd = Deno.openSync(path);
        const mod = Deno.readFileSync(fd);
        fd.close();
        return mod;
      },
    },
  );

  await wrapper.start().then(() => {
    example.terminateWorker();
  });
});

Deno.bench("Wasm Worker Start Rust Module loading", async (_b) => {
  const example: WasmWorkerDefinition = new TestExample(
    "./examples/wasm/rust/wasm_test_bg.wasm",
  );

  const wrapper: WasmInstanceWrapper<TestExample> = new WasmInstanceWrapper<
    Example
  >(
    example,
    {
      outputPath: "output",
      namespace: "asd",
      addons: [
        "./lib/wasm_test.js",
      ],
      addonLoader: (path: string) => {
        return Deno.readTextFileSync(path);
      },
      moduleLoader: (path: string) => {
        const fd = Deno.openSync(path);
        const mod = Deno.readAllSync(fd);
        fd.close();
        return mod;
      },
    },
  );

  await wrapper.start().then(() => {
    example.terminateWorker();
  });
});
