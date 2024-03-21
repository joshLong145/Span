//@ts-nocheck

import {
  assertEquals,
  assertExists,
  assertRejects,
} from "https://deno.land/std@0.210.0/assert/mod.ts";
import { InstanceWrapper, WorkerDefinition } from "../src/mod.ts";
import { existsSync } from "https://deno.land/std/fs/mod.ts";
import * as path from "https://deno.land/std@0.188.0/path/mod.ts";

declare global {
  var foo: (args: Record<string, any>) => void;
  var bar: (args: Record<string, any>) => void;
  var worker: Worker;
}

class TestExample extends WorkerDefinition {
  public constructor() {
    super();
  }

  foo = (
    buffer: SharedArrayBuffer,
    module: Record<string, any>,
  ): ArrayBuffer => {
    const arr = new Int8Array(buffer);
    arr[0] += 1;
    console.log("this is foo", module);
    return buffer;
  };

  bar = (
    buffer: SharedArrayBuffer,
    args: Record<string, any>,
  ): SharedArrayBuffer => {
    const _arr = new Uint8Array(buffer)[0] = args.value;
    return buffer;
  };

  testErrorCatch = (
    buffer: SharedArrayBuffer,
    args: Record<string, any>,
  ): SharedArrayBuffer => {
    //@ts-ignore testing error handling;
    args.foo.bar();
    return buffer;
  };

  testInfiniteLoop = (
    buffer: SharedArrayBuffer,
    _args: Record<string, any>,
  ): SharedArrayBuffer => {
    while (true) {}
    return buffer;
  };
}

Deno.test("Generated bridge should load functions into global", async () => {
  const inst = new TestExample();
  const wrapper = new InstanceWrapper<TestExample>(inst, {
    outputPath: "./public/js",
    namespace: "test",
  });

  if (!existsSync("./public")) {
    Deno.mkdirSync("./public");
  }

  if (!existsSync("./public/js")) {
    Deno.mkdirSync("./public/js");
  }

  wrapper.create({
    writeFileSync: Deno.writeFileSync,
  });
  const __dirname = path.dirname(path.fromFileUrl(import.meta.url));
  await import(__dirname + "/../public/js/bridge.js");

  assertExists(self["test.foo"]);

  assertExists(self["test.bar"]);
  await self["foo"]({ hey: "wow" });
  const prms = self["test.foo"]({ foo: "bar" });
  await prms;

  assertExists(prms.timeout);
  assertExists(prms.resolve);
  assertExists(prms.reject);
  assertExists(prms.timerIds);

  await assertRejects(
    () => {
      const workerPrms = self["testInfiniteLoop"]();
      workerPrms.timeout(1_000);
      return workerPrms.finally(() => {
        assertEquals(workerPrms.settledCount, 1);
      });
    },
    Error,
    "Timeout has occured, aborting worker execution",
  );

  self["worker"].terminate();
});
