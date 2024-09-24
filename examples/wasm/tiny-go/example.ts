import {
  InstanceWrapper,
  WorkerDefinition,
} from "../../../src/InstanceWrapper.ts";
import type { WorkerAny } from "../../../src/types.ts";
import { readAllSync } from 'https://deno.land/std/io/read_all.ts';

class Example extends WorkerDefinition {
  public constructor() {
    super();
  }

  generatePrimes = (
    buffer: SharedArrayBuffer,
    _args: WorkerAny,
  ): SharedArrayBuffer => {
    const arr = new Int8Array(buffer);
    arr[0] += 1;
    //@ts-ignore
    self.primeGenerator();
    return arr.buffer as SharedArrayBuffer;
  };
}

const example: Example = new Example();

const wrapper: InstanceWrapper<Example> = new InstanceWrapper<Example>(
  example,
  {
    outputPath: "output",
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
      return readAllSync(fd);
    },
    workerCount: 5,
  },
);

wrapper.start();

await example.execute("generatePrimes", {}).promise.then(
  (buf: SharedArrayBuffer) => {
    console.log("first value in buffer ", new Int32Array(buf)[0]);
  },
);

example.terminateWorker();

await wrapper.restart();
console.log("restarting web workers");

await example.execute("generatePrimes", {}).promise.then(
  (buf: SharedArrayBuffer) => {
    console.log("first value in buffer ", new Int32Array(buf)[0]);
  },
);

example.terminateWorker();
