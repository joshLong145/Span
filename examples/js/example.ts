import type { TaskPromise } from "../../src/PromiseExtension.ts";
import type { InstanceConfiguration } from "../../src/types.ts";
import { InstanceWrapper, WorkerDefinition } from "./../../src/mod.ts";
class Example extends WorkerDefinition {
  public constructor() {
    super();
  }

  addOne = (
    buffer: SharedArrayBuffer,
    args: Record<string, any>,
  ): SharedArrayBuffer => {
    const arr = new Uint32Array(buffer);
    arr[0] += 1;

    return buffer;
  };

  fib = (
    buffer: SharedArrayBuffer,
    args: Record<string, any>,
  ): SharedArrayBuffer => {
    let i;
    const arr = new Uint32Array(buffer);
    arr[0] = 0;
    arr[1] = 1;

    for (i = 2; i <= args.count; i++) {
      arr[i] = arr[i - 2] + arr[i - 1];
    }
    return buffer;
  };

  getKeyPair = async (
    buffer: SharedArrayBuffer,
    _args: Record<string, any>,
  ): Promise<SharedArrayBuffer> => {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 4096,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"],
    );

    console.log("generated key", _args);
    return buffer;
  };

  getGpuAdapter = async (
    buffer: SharedArrayBuffer,
    _args: Record<string, any>,
  ): Promise<SharedArrayBuffer> => {
    const adapter = {};
    console.log("gpu adapter", adapter);

    return buffer;
  };

  undefinedExecution = (
    buffer: SharedArrayBuffer,
    _args: Record<string, any>,
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

const example: Example = new Example();

const wrapper: InstanceWrapper<Example> = new InstanceWrapper<Example>(
  example,
  {} as InstanceConfiguration,
);

await wrapper.start();

await example.execute("addOne", { name: "foo" });

for (let i = 0; i < 48; i++) {
  example.execute("getKeyPair", { num: i });
}

await example.execute("fib", { count: 46 });
await example.execute("getGpuAdapter");

let workerPrms: TaskPromise = example.execute("undefinedExecution");
workerPrms.timeout(1_000);
workerPrms.promise.catch((err) => {
  console.log("hello");
});

//example.terminateWorker();
