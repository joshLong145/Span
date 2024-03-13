import {
  InstanceWrapper,
  WorkerDefinition,
} from "../../../src/InstanceWrapper.ts";

class Example extends WorkerDefinition {
  public constructor() {
    super();
  }

  test2 = (buffer: SharedArrayBuffer, _args: Record<string, any>) => {
    let arr = new Int8Array(buffer);
    arr[0] += 1;
    //@ts-ignore
    self.greet();
    return arr.buffer;
  };
}

const example: Example = new Example();

const wrapper: InstanceWrapper<Example> = new InstanceWrapper<Example>(
  example,
  {
    addons: [
      "./lib/wasm_test.js",
    ],
    addonLoader: (path: string) => {
      return Deno.readTextFileSync(path);
    },
    modulePath: "./examples/wasm/rust/wasm_test_bg.wasm",
    moduleLoader: (path: string) => {
      const fd = Deno.openSync(path);
      return Deno.readAllSync(fd);
    },
  },
);

await wrapper.start();
await example.execute("test2").then((buffer: SharedArrayBuffer) => {
  console.log(new Uint8Array(buffer)[0]);
});
example.terminateWorker();
