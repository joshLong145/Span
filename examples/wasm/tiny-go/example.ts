import {
  InstanceWrapper,
  WorkerDefinition,
} from "../../../src/InstanceWrapper.ts";

class Example extends WorkerDefinition {
  public constructor() {
    super();
  }

  test2 = (
    buffer: SharedArrayBuffer,
    _args: Record<string, any>,
  ): SharedArrayBuffer => {
    const arr = new Int8Array(buffer);
    arr[0] += 1;
    //@ts-ignore
    self.primeGenerator();
    return arr.buffer as SharedArrayBuffer;
  };

  test1 = (
    buffer: SharedArrayBuffer,
    _args: Record<string, any>,
  ): SharedArrayBuffer => {
    const arr = new Int32Array(buffer);
    const myString = "A rather long string of English text, an error message \
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
  };
}

const example: Example = new Example();

const wrapper: InstanceWrapper<Example> = new InstanceWrapper<Example>(
  example,
  {
    outputPath: "output",
    namespace: "asd",
    addons: [
      "./lib/wasm_exec_tiny.js",
    ],
    modulePath: "./examples/wasm/tiny-go/primes-2.wasm",
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

await example.execute("test1");
await example.execute("test2").then((buf: SharedArrayBuffer) => {
  console.log("first value in buffer ", new Int32Array(buf)[0]);
});

example.terminateWorker();

await wrapper.restart();
console.log("restarting web worker");

await example.execute("test2").then((buf: SharedArrayBuffer) => {
  console.log("first value in buffer ", new Int32Array(buf)[0]);
});

example.terminateWorker();
