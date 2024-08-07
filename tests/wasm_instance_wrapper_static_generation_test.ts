import {
  type assertEquals,
  assertExists,
} from "https://deno.land/std@0.210.0/assert/mod.ts";

import { InstanceWrapper, WorkerDefinition } from "../src/mod.ts";
import { existsSync } from "https://deno.land/std@0.211.0/fs/exists.ts";
import * as path from "https://deno.land/std@0.188.0/path/mod.ts";
import { WorkerAny } from "../src/types.ts";

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
  const example: RustTestExample = new RustTestExample();

  const wrapper: InstanceWrapper<RustTestExample> = new InstanceWrapper<
    RustTestExample
  >(
    example,
    {
      addons: [
        "./lib/wasm_test.js",
      ],
      outputPath: "./public/wasm",
      namespace: "wasmTest",
      modulePath: "./examples/wasm/rust/wasm_test_bg.wasm",
      addonLoader: (path: string) => {
        return Deno.readTextFileSync(path);
      },
      moduleLoader: (path: string) => {
        const fd = Deno.openSync(path);
        const source = Deno.readAllSync(fd);
        fd.close();
        return source;
      },
      workerCount: 5,
    },
  );

  if (!existsSync("./public/wasm")) {
    Deno.mkdirSync("./public/wasm");
  }

  wrapper.create({
    writeFileSync: Deno.writeFileSync,
  });

  const __dirname = path.dirname(path.fromFileUrl(import.meta.url));
  await import(__dirname + "/../public/wasm/bridge.js").then(async () => {
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
});
