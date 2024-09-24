import {
  type assertEquals,
  assertExists,
} from "https://deno.land/std@0.210.0/assert/mod.ts";
import * as path from "https://deno.land/std@0.224.0/path/mod.ts";

import { InstanceWrapper, WorkerDefinition } from "../src/mod.ts";
import { existsSync } from "https://deno.land/std@0.211.0/fs/exists.ts";
import { readAllSync } from 'https://deno.land/std/io/read_all.ts';

import type { WorkerAny } from "../src/types.ts";

class RustTestExample extends WorkerDefinition {
  public constructor() {
    super();
  }

  test2 = (buffer: SharedArrayBuffer, _args: WorkerAny) => {
    let arr = new Int8Array(buffer);
    arr[0] += 1;
    //@ts-ignore
    self.greet();
    //@ts-ignore
    let _val = self.getValue();

    return arr.buffer;
  };

  asyncTest = async (
    buffer: SharedArrayBuffer,
    _args: WorkerAny,
  ): Promise<SharedArrayBuffer> => {
    const prms: Promise<void> = new Promise((res, _rej) => {
      const _a = 2 + 2;
      res();
    });
    await prms;

    return buffer;
  };
}

Deno.test("WASM Worker Should generate worker and load functions into global", async () => {
  //TODO: pathing when importing generated module is not working properly on windows due to
  // 'invalid schema' error
  if (Deno.build.os != "windows") {
    const example: RustTestExample = new RustTestExample();
    const wasmLibPath = path.join(Deno.cwd(), "lib", "wasm_test.js");
    const wasmModPath = path.join(
      Deno.cwd(),
      "examples",
      "wasm",
      "rust",
      "wasm_test_bg.wasm",
    );

    const wrapper: InstanceWrapper<RustTestExample> = new InstanceWrapper<
      RustTestExample
    >(
      example,
      {
        addons: [
          wasmLibPath,
        ],
        outputPath: path.join(Deno.cwd(), "public", "wasm"),
        namespace: "wasmTest",
        modulePath: wasmModPath,
        addonLoader: (path: string) => {
          return Deno.readTextFileSync(path);
        },
        moduleLoader: (path: string) => {
          const fd = Deno.openSync(path);
          const source = readAllSync(fd);
          fd.close();
          return source;
        },
        workerCount: 5,
      },
    );

    if (!existsSync(path.join(Deno.cwd(), "public", "wasm"))) {
      Deno.mkdirSync(path.join(Deno.cwd(), "public", "wasm"));
    }

    wrapper.create({
      writeFileSync: Deno.writeFileSync,
    });

    const _module = await import(
      path.join(Deno.cwd(), "public", "wasm", "bridge.js")
    ).then(async () => {
      //@ts-ignore global defined
      assertExists(self["test2"]);
      //@ts-ignore global defined
      await self["test2"]({ dom: "hey" });
      //@ts-ignore global defined
      await self["asyncTest"]();
      //@ts-ignore global defined
      await self["wasmTest.asyncTest"]();
    });

    //@ts-ignore global defined
    self["pool"].terminate();
  }
});
