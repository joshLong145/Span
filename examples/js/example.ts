import { InstanceConfiguration } from "../../src/types.ts";
import { InstanceWrapper, WorkerDefinition } from "./../../src/mod.ts";
class Example extends WorkerDefinition {
  public constructor() {
    super();
  }

  public test2(
    buffer: SharedArrayBuffer,
    module: Record<string, any>,
  ): ArrayBuffer {
    console.log("name ", module.name);
    let arr = new Int8Array(buffer);
    arr[0] += 1;
    return arr.buffer;
  }

  public test1(
    buffer: SharedArrayBuffer,
    module: Record<string, any>,
  ): ArrayBuffer {
    var i;
    var fib = [0, 1]; // Initialize array!

    for (i = 2; i <= 1000; i++) {
      // Next fibonacci number = previous + one before previous
      // Translated to JavaScript:
      fib[i] = fib[i - 2] + fib[i - 1];
      console.log(fib[i]);
    }
  }
}

const example: WorkerDefinition = new Example();

const wrapper: InstanceWrapper<Example> = new InstanceWrapper<Example>(
  example,
  {
    outputPath: "output",
    namespace: "test",
  } as InstanceConfiguration,
);

wrapper.start();

await example.execute("test1").then((buf: SharedArrayBuffer) => {
  console.log("hello", new Int32Array(buf));
});
await example.execute("test2", { name: "foo" }).then(
  (buf: SharedArrayBuffer) => {
    console.log("hello1", new Int32Array(buf)[0]);
  },
);

await example.execute("test2", { name: "foo" }).then(
  (buf: SharedArrayBuffer) => {
    console.log("hello2", new Int32Array(buf)[0]);
  },
);
await example.execute("test2").then((buf: SharedArrayBuffer) => {
  console.log("hello3", new Int32Array(buf)[0]);
});

example.terminateWorker();
