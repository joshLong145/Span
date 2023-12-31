import { InstanceConfiguration } from "../../src/types.ts";
import { InstanceWrapper, WorkerDefinition } from "./../../src/mod.ts";
class Example extends WorkerDefinition {
  public constructor() {
    super();
  }

  public addOne(
    buffer: SharedArrayBuffer,
    args: Record<string, any>,
  ): SharedArrayBuffer {
    console.log("param name value: ", args.name);
    const arr = new Int8Array(buffer);
    arr[0] += 1;
    return buffer;
  }

  public fib(
    buffer: SharedArrayBuffer,
    args: Record<string, any>,
  ): SharedArrayBuffer {
    let i;
    const arr = new Uint8Array(buffer);
    arr[0] = 0;
    arr[1] = 1;

    for (i = 2; i <= args.count; i++) {
      arr[i] = arr[i - 2] + arr[i - 1];
      console.log(arr[i]);
    }

    return buffer;
  }
}

const example: Example = new Example();

const wrapper: InstanceWrapper<Example> = new InstanceWrapper<Example>(
  example,
  {} as InstanceConfiguration,
);

wrapper.start();

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

await example.execute("fib", { count: 10 }).then(
  (buffer: SharedArrayBuffer) => {
    console.log("fib result ", new Uint8Array(buffer));
    console.log("last fib number", new Uint8Array(buffer)[10]);
  },
);

example.terminateWorker();
