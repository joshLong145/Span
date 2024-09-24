# Span: Worker Pooling abstraction

[![Deno module](https://shield.deno.dev/x/span)](https://deno.land/x/span)
[![JSR](https://jsr.io/badges/@joshlong145/span)](https://jsr.io/@joshlong145/span)
[![Unit Test CI](https://github.com/joshLong145/Span/actions/workflows/test.yml/badge.svg)](https://github.com/joshLong145/Span/actions/workflows/test.yml)

<p align="center">
  <img width="200px" height="200px" src="https://github.com/joshLong145/DenoWebWorkerBridge/blob/master/images/worker-friend.png?raw=true" />
</p>

`Span` provides a simplified way to use Web Workers in Deno and other JavaScript
runtimes. Abstracting the complexities of Web Workers of WebWorkers through a
pooling abstraction. Allowing you to define methods within a class that are
automatically translated into functions executed in a Web Worker. This module
helps manage execution state and shared memory using `SharedArrayBuffer`.

## Features

- **Class-based Definition**: Define methods in a class extending
  `WorkerDefinition`, which are then converted into functions that run in a Web
  Worker.
- **Shared Memory**: Utilize `SharedArrayBuffer` to cache and manage execution
  state.
- **Pooling**: Support for parallelization through an internal `Worker Pool` to
  allow for true parallel task execution.
- **WebAssembly (WASM) Support**: Integrate and interact with WASM modules
  compiled from languages such as GoLang and Rust.

**note** when compiling rust through `wasm bidgen` only `--target web` is known
to be supported.

## Installation

Install via Deno:

```bash
deno install -A -f https://deno.land/x/span/mod.ts
```

Install via JSR (for use with Deno)

```bash
deno add @joshlong145/span
```

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

await example.execute("addOne", {name: 'foo'}).promise.then((buf: SharedArrayBuffer) => {
  console.log("add one result: ", new Int32Array(buf));
});
await example.execute("addOne", { name: "foo" }).promise.then(
  (buf: SharedArrayBuffer) => {
    console.log("add one result ", new Int32Array(buf)[0]);
  },
);

await example.execute("fib", {count: 10}).promise.then((buffer: SharedArrayBuffer) => {
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
await example.execute('fib' {count: 10}).promise.then((buffer: SharedArrayBuffer) => {
  console.log("final fib number", new Uint8Array(buffer)[10]);
});

example.terminateWorker();
```

# Example JS With WASM

The below example uses a WASM module compiled from `Golang` using `tiny-go`.
Below we provide the go WASM runtime as an `addon` and give a callback for
loading the module at the given file path.

```javascript
class Example extends WorkerDefinition {

    public constructor() {
        super();
    }

    addOne = (buffer: SharedArrayBuffer, module: any) => {
        let arr = new Int8Array(buffer);
        arr[0] += 1
        //@ts-ignore
        self.primeGenerator()
        return arr.buffer
    }
}

const example: Example = new Example();

const wrapper: InstanceWrapper<Example> = new InstanceWrapper<Example>(example, {
     addons: [
      "./lib/wasm_exec_tiny.js",
    ],
    modulePath: "./examples/wasm/primes-2.wasm",
    addonLoader: (path: string) => {
      return Deno.readTextFileSync(path);
    },
    moduleLoader: (path: string) => {
      const fd = Deno.openSync(path);
      //import { readAllSync } from 'https://deno.land/std/io/read_all.ts';
      return readAllSync(fd);
    },
});

wrapper.start();

await example.execute("addOne").promise.then((buf: SharedArrayBuffer) => {
    console.log("buffer returned ", new Int32Array(buf))
});

example.terminateWorker();
```
