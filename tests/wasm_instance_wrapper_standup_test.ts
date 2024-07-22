import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.210.0/assert/mod.ts";
import { InstanceWrapper, WorkerDefinition } from "../src/InstanceWrapper.ts";

class TestExample extends WorkerDefinition {
  public constructor() {
    super();
  }

  test2 = (buffer: SharedArrayBuffer, _module: Record<string, any>) => {
    let arr = new Int8Array(buffer);
    arr[0] += 1;

    //@ts-ignore method injection from wasm.
    self.primeGenerator();
    return arr.buffer;
  };
}

Deno.test("Wasm Worker Wrapper manager should have config correctly defnined", () => {
  const example: TestExample = new TestExample();

  const wrapper: InstanceWrapper<TestExample> = new InstanceWrapper<
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
      workerCount: 5,
    },
  );

  example.terminateWorker();
  //@ts-ignore is defined
  assertExists(wrapper, wrapper["config"]);
  assertEquals(wrapper["_config"].namespace, "asd");
  assertEquals(wrapper["_config"].addons, ["./lib/wasm_exec_tiny.js"]);
});

Deno.test("Wasm class members should be defined", () => {
  const example: TestExample = new TestExample();

  const wrapper: InstanceWrapper<TestExample> = new InstanceWrapper<
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
      workerCount: 5,
    },
  );

  example.terminateWorker();
  assertExists(wrapper["_instance"]);
  assertExists(wrapper["_wb"]);
  assertExists(wrapper["_wm"]);
});

Deno.test("Wasm class should have correct worker number on start", () => {
  const example: TestExample = new TestExample();

  const wrapper: InstanceWrapper<TestExample> = new InstanceWrapper<
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
      workerCount: 5,
    },
  );

  wrapper.start();
  example.terminateWorker();

  //@ts-ignore private members defined
  assertEquals(wrapper["_wm"]["_workers"].length, 1);
});

Deno.test("Wasm class ", () => {
  const example: TestExample = new TestExample();

  const wrapper: InstanceWrapper<TestExample> = new InstanceWrapper<
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
      workerCount: 5,
    },
  );

  wrapper.start();
  example.terminateWorker();

  //@ts-ignore private members defined
  assertEquals(wrapper["_wm"]["_workers"].length, 1);
});
