import {
  WasmInstanceWrapper,
  WasmWorkerDefinition,
} from "./../../../src/WasmInstanceWrapper.ts";

class Example extends WasmWorkerDefinition {
  public constructor(modulePath: string) {
    super(modulePath);
  }

  test2 = (buffer: SharedArrayBuffer, args: Record<string, any>) => {
    let arr = new Int8Array(buffer);
    arr[0] += 1;
    //@ts-ignore
    self.greet();
    return arr.buffer;
  };
}

const example: Example = new Example(
  "./examples/wasm/rust/wasm_test_bg.wasm",
);

const wrapper: WasmInstanceWrapper<Example> = new WasmInstanceWrapper<Example>(
  example,
  {
    addons: [
      "./lib/wasm_test.js",
    ],
    addonLoader: (path: string) => {
      return Deno.readTextFileSync(path);
    },
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
