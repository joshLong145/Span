//@ts-nocheck

import { InstanceWrapper, WorkerDefinition } from "../src/mod.ts";

class TestExample extends WorkerDefinition {
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
  const example: WorkerDefinition = new TestExample();

  const wrapper: InstanceWrapper<TestExample> = new InstanceWrapper<
    Example
  >(
    example,
    {
      outputPath: "output",
      namespace: "testing",
      addons: [
        "./lib/wasm_exec_tiny.js",
      ],
      modulePath: "./examples/wasm/tiny-go/primes-2.wasm",
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

Deno.bench("Wasm Worker Start Rust Module loading", async (_b) => {
  const example: WorkerDefinition = new TestExample();

  const wrapper: InstanceWrapper<TestExample> = new InstanceWrapper<
    Example
  >(
    example,
    {
      outputPath: "output",
      namespace: "asd",
      addons: [
        "./lib/wasm_test.js",
      ],
      modulePath: "./examples/wasm/rust/wasm_test_bg.wasm",
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
