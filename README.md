# Deno WebWorker Bridge Generator
Allows for class definitions to be translated to awaitable function definitons which run in the same `Web Worker`
Each function defined within a given class definition is passed an `SharedArrayBuffer` which can be used for caching execution state for later use.
## Example
```
class Example extends WorkerDefinition {

    public constructor() {
        super();
    }

    public test2(buffer: SharedArrayBuffer) {
        let arr = new Int8Array(buffer);
        arr[0] = 1;
    }
    
   public test1(buffer: SharedArrayBuffer) {
        let arr = new Int8Array(buffer);
        arr[0] = 2;
        for (let i = 0; i < 10; i ++) {
            console.log("hello world")
        }
    }
}

const wraper: InstanceWrapper<Example> = new InstanceWrapper<Example>(new Example(), {
    outputPath: 'output'
});

wraper.Create({
    writeFileSync: Deno.writeFileSync
});
```
Usage of generated code
```
    import {foo} from '<path/to.bridge.js>'
    await foo().then(() => {
        console.log("bar");
    })
```

