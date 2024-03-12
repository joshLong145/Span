# Span: A Web Worker Bridging Module

[![deno module](https://shield.deno.dev/x/span)](https://deno.land/x/span)
[![Unit Test CI](https://github.com/joshLong145/Span/actions/workflows/test.yml/badge.svg)](https://github.com/joshLong145/Span/actions/workflows/test.yml)

<p align="center">
  <img width="200px" height="200px" src="https://github.com/joshLong145/DenoWebWorkerBridge/blob/master/images/worker-friend.png?raw=true" />
</p>

Allows for class definitions to be translated to awaitable function definitions
which run in the same `Web Worker` Each function defined within a given class
definition is passed an `SharedArrayBuffer` which can be used for caching
execution state for later use. The goal of this project is to lower the barrier
to use web workers within applications and provide an intuitive abstraction for
managing execution state and shared memory.

Each function within a class definition extending `WorkerDefinition` is given
its own shared buffer instance which is accessible from the generated `bridge`
the bridge exports all wrapper functions for the given definition.

## Running Web Assembly modules

It's also possible to declare a `Web Assembly` file which can be interfaced with
with in the worker context.

Currently supports

- `Golang`
- `Rust`

compiled WASM. Support will be added for WASM compiled and instated through
module exports shall be added.

**note** when compiling rust through `wasm bidgen` only `--target web` is known
to be supported.

_Under development, still largely a work in progress_ Should not be used in
production.

## Example JS

```javascript
class Example extends WorkerDefinition {
  public constructor() {
    super();
  }

  addOne = (
    buffer: SharedArrayBuffer,
    args: Record<string, any>,
  ): SharedArrayBuffer => {
    console.log("param name value: ", args.name);
    const arr = new Int8Array(buffer);
    arr[0] += 1;
    return buffer;
  }

  fib = (
    buffer: SharedArrayBuffer,
    module: Record<string, any>,
  ): SharedArrayBuffer => {
    let i;
    const arr = new Uint8Array(buffer);
    arr[0] = 0;
    arr[1] = 1;

    for (i = 2; i <= module.count; i++) {
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

await example.execute("addOne", {name: 'foo'}).then((buf: SharedArrayBuffer) => {
  console.log("add one result: ", new Int32Array(buf));
});
await example.execute("addOne", { name: "foo" }).then(
  (buf: SharedArrayBuffer) => {
    console.log("add one result ", new Int32Array(buf)[0]);
  },
);

await example.execute("fib", {count: 10}).then((buffer: SharedArrayBuffer) => {
  console.log('fib result ', new Uint8Array(buffer));
  console.log('last fib number', new Uint8Array(buffer)[10]);
});
```

Usage of generated code

```javascript
class Example extends WorkerDefinition {
  public constructor() {
    super();
  }

  addOne = (
    buffer: SharedArrayBuffer,
    args: Record<string, any>,
  ): SharedArrayBuffer => {
    console.log("param name value: ", args.name);
    const arr = new Int8Array(buffer);
    arr[0] += 1;
    return buffer;
  }

  fib = (
    buffer: SharedArrayBuffer,
    module: Record<string, any>,
  ): SharedArrayBuffer => {
    let i;
    const arr = new Uint8Array(buffer);
    arr[0] = 0;
    arr[1] = 1;

    for (i = 2; i <= module.count; i++) {
      arr[i] = arr[i - 2] + arr[i - 1];
      console.log(arr[i]);
    }
    
    return buffer;
  }
}
const example: Example = new Example();

const wrapper: InstanceWrapper<Example> = new InstanceWrapper<Example>(
  example,
  {
    outputPath: "/path/to/gen/output"
  } as InstanceConfiguration,
);

wrapper.create();
import { foo } from "<path/to/bridge.js>";
await foo().then(() => {
  console.log("bar");
});
```

## Usage in process (uses example from above)

```javascript
const example: WorkerDefinition = new Example();

const wrapper: InstanceWrapper<Example> = new InstanceWrapper<Example>(example, {
    outputPath: 'output'
});

wrapper.start();
await example.execute('fib' {count: 10}).then((buffer: SharedArrayBuffer) => {
  console.log("final fib number", new Uint8Array(buffer)[10]);
});

example.terminateWorker();
```

# Example JS With WASM

The below example uses a WASM module compiled from `Golang` using `tiny-go`.
Below we provide the go WASM runtime as an `addon` and give a callback for
loading the module at the given file path.

```javascript
import { WasmInstanceWrapper, WasmWorkerDefinition } from "./../../src/mod.ts";
class Example extends WasmWorkerDefinition {

    public constructor(modulePath: string) {
        super(modulePath);
    }

    addOne = (buffer: SharedArrayBuffer, module: any) => {
        let arr = new Int8Array(buffer);
        arr[0] += 1
        //@ts-ignore
        self.primeGenerator()
        return arr.buffer
    }
}

const example: Example = new Example("./examples/wasm/primes-2.wasm");

const wrapper: WasmInstanceWrapper<Example> = new WasmInstanceWrapper<Example>(example, {
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
});

wrapper.start();
//@ts-ignore
await example.execute("addOne").then((buf: SharedArrayBuffer) => {
    console.log("buffer returned ", new Int32Array(buf))
});

example.terminateWorker();
```
