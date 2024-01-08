import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.210.0/assert/mod.ts";

import { WasmInstanceWrapper } from "../src/mod.ts";
import { WasmWorkerDefinition } from "../src/WasmInstanceWrapper.ts";
import { existsSync } from "https://deno.land/std@0.211.0/fs/exists.ts";
import * as path from "https://deno.land/std@0.188.0/path/mod.ts";

class RustTestExample extends WasmWorkerDefinition {
  public constructor(modulePath: string) {
    super(modulePath);
  }

  public test2(buffer: SharedArrayBuffer, args: Record<string, any>) {
    console.log(args.dom);
    let arr = new Int8Array(buffer);
    arr[0] += 1;
    //@ts-ignore
    self.greet();
    //@ts-ignore
    let val = self.getValue();
    console.log(val);
    return arr.buffer;
  }
}

Deno.test("WASM Worker Should generate worker and load functions into global", async () => {
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
      outputPath: "./public/wasm",
      namespace: "test",
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

  if (!existsSync("./public/wasm")) {
    Deno.mkdirSync("./public/wasm");
  }

  wrapper.create({
    writeFileSync: Deno.writeFileSync,
  });

  const __dirname = path.dirname(path.fromFileUrl(import.meta.url));
  await import(__dirname + "/../public/wasm/bridge.js").then(async (module) => {
    //@ts-ignore
    assertExists(self["test2"]);
    //@ts-ignore
    await self["test2"]({ dom: "hey" });
  });

  //@ts-ignore
  self["worker"].terminate();
});
