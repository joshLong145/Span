import {
  assertEquals,
  assertExists,
  assertRejects,
} from "https://deno.land/std@0.210.0/assert/mod.ts";
import * as path from "https://deno.land/std@0.224.0/path/mod.ts";
import { InstanceWrapper, WorkerDefinition } from "../src/mod.ts";
import { existsSync } from "https://deno.land/std/fs/mod.ts";
import type { WorkerAny } from "../src/types.ts";
import { readAllSync } from "https://deno.land/std/io/read_all.ts";

declare global {
  const test: {
    foo: (args: WorkerAny) => void;
    bar: (args: WorkerAny) => void;
  };
  const worker: Worker;
}

class TestExample extends WorkerDefinition {
  public constructor() {
    super();
  }

  foo = (
    buffer: SharedArrayBuffer,
    _args: WorkerAny,
  ): ArrayBuffer => {
    const arr = new Int8Array(buffer);
    arr[0] += 1;

    return buffer;
  };

  bar = (
    buffer: SharedArrayBuffer,
    args: WorkerAny,
  ): SharedArrayBuffer => {
    const _arr = new Uint8Array(buffer)[0] = args.value as number;
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
    _args: WorkerAny,
  ): Promise<SharedArrayBuffer> => {
    let id = 0;
    return new Promise<SharedArrayBuffer>((res, _rej) => {
      id = setTimeout(() => {
        res(buffer);
      }, 10_000);
    }).finally(() => {
      clearTimeout(id);
      return buffer;
    });
  };
}

Deno.test("Generated bridge should load functions into global", async () => {
  if (Deno.build.os != "windows") {
    const inst = new TestExample();
    const wrapper = new InstanceWrapper<TestExample>(inst, {
      outputPath: path.join(Deno.cwd(), "public", "js"),
      namespace: "test",
      workerCount: 2,
    });

    if (!existsSync(path.join(Deno.cwd(), "public"))) {
      Deno.mkdirSync(path.join(Deno.cwd(), "public"));
    }

    if (!existsSync(path.join(Deno.cwd(), "public", "js"))) {
      Deno.mkdirSync(path.join(Deno.cwd(), "public", "js"));
    }

    wrapper.create({
      writeFileSync: Deno.writeFileSync,
    });

    await import(
      path.join(import.meta.url, "..", "..", "public", "js", "bridge.js")
    );

    //@ts-ignore globally defined
    assertExists(self["test.foo"]);
    //@ts-ignore globally defined
    assertExists(self["test.bar"]);
    //@ts-ignore globally defined
    await self["foo"]({ hey: "wow" });
    //@ts-ignore globally defined
    const prms = self["test.foo"]({ foo: "bar" });
    await prms;

    assertExists(prms.timeout);
    assertExists(prms.resolve);
    assertExists(prms.reject);
    assertExists(prms.timerIds);

    await assertRejects(
      async () => {
        //@ts-ignore globally defined
        const workerPrms = self["testInfiniteLoop"]();
        workerPrms.timeout(1_000);
        await workerPrms.promise;
        assertEquals(workerPrms.settledCount, 1);
      },
      Error,
      "Timeout has occured, aborting worker execution",
    );

    //@ts-ignore globally defined
    self["pool"].terminate();
  }
});
