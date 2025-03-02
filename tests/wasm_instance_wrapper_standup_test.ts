import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.210.0/assert/mod.ts";
import * as path from "https://deno.land/std@0.224.0/path/mod.ts";
import { InstanceWrapper, WorkerDefinition } from "../src/InstanceWrapper.ts";
import type { WorkerAny } from "../src/types.ts";
import { readAllSync } from "https://deno.land/std/io/read_all.ts";

class TestExample extends WorkerDefinition {
  public constructor() {
    super();
  }

  test2 = (buffer: SharedArrayBuffer, _module: WorkerAny) => {
    let arr = new Int8Array(buffer);
    arr[0] += 1;

    //@ts-ignore method injection from wasm.
    self.primeGenerator();
    return arr.buffer;
  };
}

Deno.test("Wasm Worker Wrapper manager should have config correctly defnined", () => {
  const example: TestExample = new TestExample();
  const wasmLibPath = path.join(Deno.cwd(), "lib", "wasm_exec_tiny.js");

  const wrapper: InstanceWrapper<TestExample> = new InstanceWrapper<
    TestExample
  >(
    example,
    {
      outputPath: "output",
      namespace: "asd",
      addons: [
        wasmLibPath,
      ],
      addonLoader: (path: string) => {
        return Deno.readTextFileSync(path);
      },
      moduleLoader: (path: string) => {
        const fd = Deno.openSync(path);
        const mod = readAllSync(fd);
        fd.close();
        return mod;
      },
      workerCount: 2,
    },
  );

  example.terminateWorker();
  //@ts-ignore is defined
  assertExists(wrapper, wrapper["config"]);
  assertEquals(wrapper["_config"].namespace, "asd");
  assertEquals(wrapper["_config"].addons, [wasmLibPath]);
});

Deno.test("Wasm class members should be defined", () => {
  const example: TestExample = new TestExample();
  const wasmLibPath = path.join(Deno.cwd(), "lib", "wasm_exec_tiny.js");

  const wrapper: InstanceWrapper<TestExample> = new InstanceWrapper<
    TestExample
  >(
    example,
    {
      outputPath: "output",
      namespace: "asd",
      addons: [
        wasmLibPath,
      ],
      addonLoader: (path: string) => {
        return Deno.readTextFileSync(path);
      },
      moduleLoader: (path: string) => {
        const fd = Deno.openSync(path);
        const mod = readAllSync(fd);
        fd.close();
        return mod;
      },
      workerCount: 2,
    },
  );

  example.terminateWorker();
  assertExists(wrapper["_instance"]);
  assertExists(wrapper["_wb"]);
  assertExists(wrapper["_wm"]);
});

Deno.test("Wasm class should have correct worker number on start", async () => {
  const example: TestExample = new TestExample();
  const wasmLibPath = path.join(Deno.cwd(), "lib", "wasm_exec_tiny.js");

  const wrapper: InstanceWrapper<TestExample> = new InstanceWrapper<
    TestExample
  >(
    example,
    {
      outputPath: "output",
      namespace: "asd",
      addons: [
        wasmLibPath,
      ],
      addonLoader: (path: string) => {
        return Deno.readTextFileSync(path);
      },
      moduleLoader: (path: string) => {
        const fd = Deno.openSync(path);
        const mod = readAllSync(fd);
        fd.close();
        return mod;
      },
      workerCount: 2,
    },
  );

  await wrapper.start();
  example.terminateWorker();

  //@ts-ignore private members defined
  assertEquals(wrapper["_wm"]["_workers"].length, 1);
});

Deno.test("Wasm class ", async () => {
  const example: TestExample = new TestExample();
  const wasmLibPath = path.join(Deno.cwd(), "lib", "wasm_exec_tiny.js");

  const wrapper: InstanceWrapper<TestExample> = new InstanceWrapper<
    TestExample
  >(
    example,
    {
      outputPath: "output",
      namespace: "asd",
      addons: [
        wasmLibPath,
      ],
      addonLoader: (path: string) => {
        return Deno.readTextFileSync(path);
      },
      moduleLoader: (path: string) => {
        const fd = Deno.openSync(path);
        const mod = readAllSync(fd);
        fd.close();
        return mod;
      },
      workerCount: 2,
    },
  );

  await wrapper.start();
  example.terminateWorker();

  //@ts-ignore private members defined
  assertEquals(wrapper["_wm"]["_workers"].length, 1);
});
