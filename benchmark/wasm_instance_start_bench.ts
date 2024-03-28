//@ts-nocheck

import { InstanceWrapper, WorkerDefinition } from "../src/mod.ts";
import { existsSync } from "https://deno.land/std/fs/mod.ts";
import * as path from "https://deno.land/std@0.188.0/path/mod.ts";

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

Deno.bench("Wasm Worker Start Go Module loading", {
  group: "non imported initalization",
}, async (_b) => {
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

Deno.bench("Wasm Worker Start Rust Module loading", {
  group: "non imported initalization",
}, async (_b) => {
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

Deno.bench("Wasm Worker Start Code Gen Bootstrapping Rust", {
  group: "imported initalization",
}, async (_b) => {
  if (!existsSync("./public")) {
    Deno.mkdirSync("./public");
  }

  if (!existsSync("./public/bench")) {
    Deno.mkdirSync("./public/bench");
  }

  const example: WorkerDefinition = new TestExample();

  const wrapper: InstanceWrapper<TestExample> = new InstanceWrapper<
    Example
  >(
    example,
    {
      outputPath: "./public/bench",
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
  wrapper.create({
    writeFileSync: Deno.writeFileSync,
  });
  const __dirname = path.dirname(path.fromFileUrl(import.meta.url));
  await import(__dirname + "/../public/bench/bridge.js");
  self["pool"].terminate();
});

Deno.bench("Wasm Worker Start Code Gen Bootstrapping Tiny Go", {
  group: "imported initalization",
}, async (_b) => {
  if (!existsSync("./public")) {
    Deno.mkdirSync("./public");
  }

  if (!existsSync("./public/bench")) {
    Deno.mkdirSync("./public/bench");
  }

  const example: WorkerDefinition = new TestExample();

  const wrapper: InstanceWrapper<TestExample> = new InstanceWrapper<
    Example
  >(
    example,
    {
      outputPath: "./public/bench",
      namespace: "asd",
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
  wrapper.create({
    writeFileSync: Deno.writeFileSync,
  });
  const __dirname = path.dirname(path.fromFileUrl(import.meta.url));
  await import(__dirname + "/../public/bench/bridge.js");
  self["pool"].terminate();
});

Deno.bench("Wasm Worker Start Code Gen Bootstrapping Go", {
  group: "imported initalization",
}, async (_b) => {
  if (!existsSync("./public")) {
    Deno.mkdirSync("./public");
  }

  if (!existsSync("./public/bench")) {
    Deno.mkdirSync("./public/bench");
  }

  const example: WorkerDefinition = new TestExample();

  const wrapper: InstanceWrapper<TestExample> = new InstanceWrapper<
    Example
  >(
    example,
    {
      outputPath: "./public/bench",
      namespace: "asd",
      addons: [
        "./lib/wasm_exec.js",
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
  wrapper.create({
    writeFileSync: Deno.writeFileSync,
  });
  const __dirname = path.dirname(path.fromFileUrl(import.meta.url));
  await import(__dirname + "/../public/bench/bridge.js");
  self["pool"].terminate();
});
