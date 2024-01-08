import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.210.0/assert/mod.ts";
import { InstanceWrapper, WorkerDefinition } from "../src/mod.ts";
import { existsSync } from "https://deno.land/std/fs/mod.ts";

class TestExample extends WorkerDefinition {
  public constructor() {
    super();
  }

  public foo(
    buffer: SharedArrayBuffer,
    module: Record<string, any>,
  ): ArrayBuffer {
    const arr = new Int8Array(buffer);
    arr[0] += 1;
    console.log("this is foo", module);
    return buffer;
  }

  public bar(
    buffer: SharedArrayBuffer,
    args: Record<string, any>,
  ): SharedArrayBuffer {
    const arr = new Uint8Array(buffer)[0] = args.value;
    return buffer;
  }
}

Deno.test("Generated bridge should load functions into global", async () => {
  const inst = new TestExample();
  const wrapper = new InstanceWrapper<TestExample>(inst, {
    outputPath: "./public",
    namespace: "test",
  });
  if (!existsSync("./public")) {
    Deno.mkdirSync("./public");
  }

  wrapper.create({
    writeFileSync: Deno.writeFileSync,
  });

  await import("./../public/bridge.js");
  //@ts-ignore
  assertExists(self["bar"]);
  //@ts-ignore
  assertExists(self["bar"]);
  await self["foo"]({ hey: "wow" });

  self["worker"].terminate();
});
