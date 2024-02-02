import { InstanceConfiguration } from "../../src/types.ts";
import { InstanceWrapper, WorkerDefinition } from "./../../src/mod.ts";
import { sleep } from "https://deno.land/x/sleep/mod.ts";

class Example extends WorkerDefinition {
  public constructor() {
    super();
  }

  addOne = async (
    buffer: SharedArrayBuffer,
    args: Record<string, any>,
  ): Promise<SharedArrayBuffer> => {
    console.log("param name value: ", args.name);
    const arr = new Uint32Array(buffer);
    arr[0] += 1;

    return buffer;
  };

  fib = async (
    buffer: SharedArrayBuffer,
    args: Record<string, any>,
  ): Promise<SharedArrayBuffer> => {
    let i;
    const arr = new Uint32Array(buffer);
    arr[0] = 0;
    arr[1] = 1;

    for (i = 2; i <= args.count; i++) {
      arr[i] = arr[i - 2] + arr[i - 1];
      console.log(arr[i]);
    }
    let adapter;
    await navigator.gpu.requestAdapter().then((adpt) => {
      adapter = adpt;
      console.log(adapter);
    });

    let keyPair = await crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 4096,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"],
    );

    return buffer;
  };
}

const example: Example = new Example();

const wrapper: InstanceWrapper<Example> = new InstanceWrapper<Example>(
  example,
  {} as InstanceConfiguration,
);

wrapper.start();

(example as any).worker.onerror = (event: any) => {
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

await example.execute("fib", { count: 46 }).then(
  (buffer: SharedArrayBuffer) => {
    console.log("fib result ", new Uint32Array(buffer));
    console.log("last fib number", new Uint32Array(buffer)[46]);
  },
);

example.terminateWorker();
