import { InstanceConfiguration } from "../../src/types.ts";
import { InstanceWrapper, WorkerDefinition } from "./../../src/mod.ts";

class Example extends WorkerDefinition {
  public constructor() {
    super();
  }

  addOne = (
    buffer: SharedArrayBuffer,
    args: Record<string, any>,
  ): SharedArrayBuffer => {
    console.log("param name value: ", args.name);
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
      console.log(arr[i]);
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
}

const example: Example = new Example();

const wrapper: InstanceWrapper<Example> = new InstanceWrapper<Example>(
  example,
  {} as InstanceConfiguration,
);

wrapper.start();

example.worker.onerror = (event: any) => {
  console.log("an error occured ", event);
};

await example.execute("addOne", { name: "foo" }).then(
  (buf: SharedArrayBuffer) => {
    console.log("add one result: ", new Int32Array(buf));
  },
);
await example.execute("addOne", { name: "foo" }).then(
  (buf: SharedArrayBuffer) => {
    console.log("add one result ", new Int32Array(buf)[0]);
  },
);

await example.execute("getKeyPair");

await example.execute("fib", { count: 46 }).then(
  (buffer: SharedArrayBuffer) => {
    console.log("fib result ", new Uint32Array(buffer));
    console.log("last fib number", new Uint32Array(buffer)[46]);
  },
);
await example.execute("getGpuAdapter");
await example.execute("getGpuAdapter");

example.terminateWorker();
