import {
  WasmInstanceWrapper,
  WasmWorkerDefinition,
} from "./../../../src/WasmInstanceWrapper.ts";

class Example extends WasmWorkerDefinition {
  public constructor(modulePath: string) {
    super(modulePath);
  }

  public test2(buffer: SharedArrayBuffer, module: Record<string, any>) {
    let arr = new Int8Array(buffer);
    arr[0] += 1;
    //@ts-ignore
    self.primeGenerator();
    return arr.buffer;
  }

  public test1(
    buffer: SharedArrayBuffer,
    module: Record<string, any>,
  ): SharedArrayBuffer {
    let arr = new Int32Array(buffer);
    let myString = "A rather long string of English text, an error message \
                actually that just keeps going and going -- an error \
                message to make the Energizer bunny blush (right through \
                those Schwarzenegger shades)! Where was I? Oh yes, \
                you've got an error and all the extraneous whitespace is \
                just gravy.  Have a nice day.";
    for (let index = 0; index < 2048; index++) {
      let hash = 0;
      for (let i = 0, len = myString.length; i < len; i++) {
        let chr = myString.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0; // Convert to 32bit integer
      }
      arr[index] = hash;
    }
    return buffer;
  }
}

const example: Example = new Example(
  "./examples/wasm/tiny-go/primes-2.wasm",
);

const wrapper: WasmInstanceWrapper<Example> = new WasmInstanceWrapper<Example>(
  example,
  {
    outputPath: "output",
    namespace: "asd",
    addons: [
      "./lib/wasm_exec_tiny.js",
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

wrapper.start();

await example.execute("test1").then((buf: SharedArrayBuffer) => {
  console.log("hello", new Int32Array(buf));
});
await example.execute("test2").then((buf: SharedArrayBuffer) => {
  let arr = new Int32Array(buf);
  console.log("hello1", arr[0]);
});

await example.execute("test2").then((buf: SharedArrayBuffer) => {
  console.log("hello2", new Int32Array(buf)[0]);
});
await example.execute("test2").then((buf: SharedArrayBuffer) => {
  console.log("hello3", new Int32Array(buf)[0]);
});

example.terminateWorker();

wrapper.restart();

await example.execute("test1").then((buf: SharedArrayBuffer) => {
  console.log("hello", new Int32Array(buf));
});

await example.execute("test2").then((buf: SharedArrayBuffer) => {
  let arr = new Int32Array(buf);
  console.log("hello1", new Int32Array(buf)[0]);
});

example.terminateWorker();
