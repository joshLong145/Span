import { InstanceWrapper, WorkerDefinition } from "../src/mod.ts";
import { existsSync } from "https://deno.land/std/fs/mod.ts";
import * as path from "https://deno.land/std@0.188.0/path/mod.ts";
import { readAllSync } from "https://deno.land/std/io/read_all.ts";

class TestExample extends WorkerDefinition {
  public constructor() {
    super();
  }

  test2 = (
    buffer: SharedArrayBuffer,
    _module: Record<string, any>,
  ): SharedArrayBuffer => {
    const arr = new Int8Array(buffer);
    arr[0] += 1;
    //@ts-ignore loaded from WASM
    self.primeGenerator();
    return buffer;
  };
}

Deno.bench("Wasm Worker Start Go Module loading", {
  group: "non imported initalization",
}, async (_b) => {
  const example = new TestExample();
  const wasmLibPath = path.join(Deno.cwd(), "lib", "wasm_exec_tiny.js");
  const wasmModulePath = path.join(
    Deno.cwd(),
    "examples",
    "wasm",
    "tiny-go",
    "primes-2.wasm",
  );

  const wrapper: InstanceWrapper<TestExample> = new InstanceWrapper<
    TestExample
  >(
    example,
    {
      outputPath: "output",
      namespace: "testing",
      addons: [
        wasmLibPath,
      ],
      modulePath: wasmModulePath,
      addonLoader: (path: string) => {
        return Deno.readTextFileSync(path);
      },
      moduleLoader: (path: string) => {
        const fd = Deno.openSync(path);
        const mod = readAllSync(fd);
        fd.close();
        return mod;
      },
      workerCount: 1,
    },
  );

  await wrapper.start().then(() => {
    example.terminateWorker();
  });
});

Deno.bench("Wasm Worker Start Rust Module loading", {
  group: "non imported initalization",
}, async (_b) => {
  const example = new TestExample();
  const wasmLibPath = path.join(Deno.cwd(), "lib", "wasm_test.js");
  const wasmModulePath = path.join(
    Deno.cwd(),
    "examples",
    "wasm",
    "rust",
    "wasm_test_bg.wasm",
  );
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
      modulePath: wasmModulePath,
      addonLoader: (path: string) => {
        return Deno.readTextFileSync(path);
      },
      moduleLoader: (path: string) => {
        const fd = Deno.openSync(path);
        const mod = readAllSync(fd);
        fd.close();
        return mod;
      },
      workerCount: 1,
    },
  );

  await wrapper.start().then(() => {
    example.terminateWorker();
  });
});

Deno.bench("Wasm Worker Start Code Gen Bootstrapping Rust", {
  group: "imported initalization",
}, async (_b) => {
  const wasmLibPath = path.join(Deno.cwd(), "lib", "wasm_test.js");
  const wasmModulePath = path.join(
    Deno.cwd(),
    "examples",
    "wasm",
    "rust",
    "wasm_test_bg.wasm",
  );
  if (!existsSync("./public")) {
    Deno.mkdirSync("./public");
  }

  if (!existsSync("./public/bench")) {
    Deno.mkdirSync("./public/bench");
  }

  const example = new TestExample();

  const wrapper: InstanceWrapper<TestExample> = new InstanceWrapper<
    TestExample
  >(
    example,
    {
      outputPath: "./public/bench",
      namespace: "asd",
      addons: [
        wasmLibPath,
      ],
      modulePath: wasmModulePath,
      addonLoader: (path: string) => {
        return Deno.readTextFileSync(path);
      },
      moduleLoader: (path: string) => {
        const fd = Deno.openSync(path);
        const mod = readAllSync(fd);
        fd.close();
        return mod;
      },
      workerCount: 1,
    },
  );
  wrapper.create({
    writeFileSync: Deno.writeFileSync,
  });
  const __dirname = path.dirname(path.fromFileUrl(import.meta.url));
  await import(__dirname + "/../public/bench/bridge.js");

  //@ts-ignore defined in global
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

  const example = new TestExample();

  const wrapper: InstanceWrapper<TestExample> = new InstanceWrapper<
    TestExample
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
        const mod = readAllSync(fd);
        fd.close();
        return mod;
      },
      workerCount: 1,
    },
  );
  wrapper.create({
    writeFileSync: Deno.writeFileSync,
  });

  const __dirname = path.dirname(path.fromFileUrl(import.meta.url));
  await import(__dirname + "/../public/bench/bridge.js");
  //@ts-ignore global defined`
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

  const example = new TestExample();

  const wrapper: InstanceWrapper<TestExample> = new InstanceWrapper<
    TestExample
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
        const mod = readAllSync(fd);
        fd.close();
        return mod;
      },
      workerCount: 1,
    },
  );
  wrapper.create({
    writeFileSync: Deno.writeFileSync,
  });

  const __dirname = path.dirname(path.fromFileUrl(import.meta.url));
  await import(__dirname + "/../public/bench/bridge.js");
  //@ts-ignore global defined
  self["pool"].terminate();
});
