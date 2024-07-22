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
  { workerCount: 25 } as InstanceConfiguration,
);

await wrapper.start();

const prms = example.execute("addOne").promise.then(
  (buffer: SharedArrayBuffer) => {
    console.log("result", new Uint8Array(buffer)[0]);
  },
);

const workerPrms: TaskPromise = example.execute("undefinedExecution");
workerPrms.timeout(1_000);
workerPrms.promise.catch((err) => {
  console.error("a timeout occured", err);
});
await prms;
example.terminateWorker();
