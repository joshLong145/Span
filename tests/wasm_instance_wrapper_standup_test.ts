//@ts-nocheck
import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.210.0/assert/mod.ts";
import {
  WasmInstanceWrapper,
  WasmWorkerDefinition,
} from "../src/WasmInstanceWrapper.ts";

class TestExample extends WasmWorkerDefinition {
  public constructor(modulePath: string) {
    super(modulePath);
  }

  public test2(buffer: SharedArrayBuffer, module: Record<string, any>) {
    let arr = new Int8Array(buffer);
    arr[0] += 1;

    self.primeGenerator();
    return arr.buffer;
  }
}

Deno.test("Wasm Worker Wrapper manager should have config correctly defnined", () => {
  const example: WasmWorkerDefinition = new TestExample(
    "./examples/wasm/tiny-go/primes-2.wasm",
  );

  const wrapper: WasmInstanceWrapper<TestExample> = new WasmInstanceWrapper<
    Example
  >(
    example,
    {
      outputPath: "output",
      namespace: "asd",
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

  example.terminateWorker();
  assertExists(wrapper, wrapper["config"]);
  assertEquals(wrapper["_config"].namespace, "asd");
  assertEquals(wrapper["_config"].addons, ["./lib/wasm_exec_tiny.js"]);
});

Deno.test("Wasm class members should be defined", () => {
  const example: WasmWorkerDefinition = new TestExample(
    "./examples/wasm/tiny-go/primes-2.wasm",
  );

  const wrapper: WasmInstanceWrapper<TestExample> = new WasmInstanceWrapper<
    Example
  >(
    example,
    {
      outputPath: "output",
      namespace: "asd",
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

  example.terminateWorker();
  assertExists(wrapper["_instance"]);
  assertExists(wrapper["_wb"]);
  assertExists(wrapper["_wm"]);
});

Deno.test("Wasm class should have correct worker number on start", () => {
  const example: WasmWorkerDefinition = new TestExample(
    "./examples/wasm/tiny-go/primes-2.wasm",
  );

  const wrapper: WasmInstanceWrapper<TestExample> = new WasmInstanceWrapper<
    TestExample
  >(
    example,
    {
      outputPath: "output",
      namespace: "asd",
      addons: [
        "./lib/wasm_exec_tiny.js",
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

  wrapper.start();
  example.terminateWorker();

  assertEquals(wrapper["_wm"]["_workers"].length, 1);
});

Deno.test("Wasm class ", () => {
  const example: WasmWorkerDefinition = new TestExample(
    "./examples/wasm/tiny-go/primes-2.wasm",
  );

  const wrapper: WasmInstanceWrapper<TestExample> = new WasmInstanceWrapper<
    TestExample
  >(
    example,
    {
      outputPath: "output",
      namespace: "asd",
      addons: [
        "./lib/wasm_exec_tiny.js",
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

  wrapper.start();
  example.terminateWorker();

  assertEquals(wrapper["_wm"]["_workers"].length, 1);
});