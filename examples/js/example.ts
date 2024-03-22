import { assertExists } from "https://deno.land/std@0.210.0/assert/assert_exists.ts";
import { InstanceConfiguration } from "../../src/types.ts";
import { InstanceWrapper, WorkerDefinition } from "./../../src/mod.ts";
import { assertIsError } from "https://deno.land/std@0.210.0/assert/assert_is_error.ts";

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

    console.log("generated key", keyPair);
    return buffer;
  };

  getGpuAdapter = async (
    buffer: SharedArrayBuffer,
    _args: Record<string, any>,
  ): Promise<SharedArrayBuffer> => {
    const adapter = await navigator.gpu.requestAdapter();
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

wrapper.start();

await example.execute("addOne", { name: "foo" }).then(
  (buf: SharedArrayBuffer) => {
    assertExists(buf);
  },
);
await example.execute("getKeyPair");

await example.execute("fib", { count: 46 });
await example.execute("getGpuAdapter");

const workerPrms = example.execute("undefinedExecution");

// handle a rejection of the promise due to a timeout
workerPrms.catch((e) => {
  assertIsError(e);
});

// timeout the above execution call in 1 second
workerPrms.timeout(1_000);

// you can also use await with a try catch to manage the timeout
try {
  await workerPrms;
} catch (e) {
  assertIsError(e);
}

example.terminateWorker();
