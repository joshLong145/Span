# Another Web Worker Bridge Generator

Allows for class definitions to be translated to awaitable function definitons which run in the same `Web Worker`
Each function defined within a given class definition is passed an `SharedArrayBuffer` which can be used for caching execution state for later use. The goal of this project is to lower the barier to use webworkers within applications and provide an intuative abstraction for managing execution state and shared memory.

Each function within a class definiton extending `WorkerDefinition` is given its own shared buffer instance which is acessible from the generated `bridge` the bridge exports all wrapper functions for the given definition.


*Under development, still largely a work in progress*
Should not be used in production.

**todo**
- Allow for configurable deno support.
- Allow for buffer encoding into bridge definition, removing the need for disk IO at time of bootstrap (done)
- Pass buffers to resolve of Promses for convience in accessing function buffers

## Example
```
class Example extends WorkerDefinition {

    public constructor() {
        super();
    }

    public test2(buffer: SharedArrayBuffer) {
        let arr = new Int8Array(buffer);
        arr[0] = 1
    
        return arr
    }
    
   public test1(buffer: SharedArrayBuffer) {
    let arr = new Int32Array(buffer);
    var myString = 'A rather long string of English text, an error message \
            actually that just keeps going and going -- an error \
            message to make the Energizer bunny blush (right through \
            those Schwarzenegger shades)! Where was I? Oh yes, \
            you\'ve got an error and all the extraneous whitespace is \
            just gravy.  Have a nice day.'
    for (var index = 0; index < 2048; index++) {
        let hash = 0;
        for (let i = 0, len = myString.length; i < len; i++) {
            let chr = myString.charCodeAt(i);
            hash = (hash << 5) - hash + chr;
            hash |= 0; // Convert to 32bit integer
        }
        arr[index] = hash
    }
    return arr;
},
    }
}

const wrapper: InstanceWrapper<Example> = new InstanceWrapper<Example>(new Example(), {
    outputPath: 'output'
});

wrapper.Create({
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

Usage in process (uses example from above)
```
const example: WorkerDefinition = new Example();

const wrapper: InstanceWrapper<Example> = new InstanceWrapper<Example>(example, {
    outputPath: 'output'
});

wrapper.start();
```

Invoking
```
await example.execute("test1").then(() => {
    console.log("hello")
})

example.execute("test2").then(() => {
    console.log("hello1")
})
example.execute("test2").then(() => {
    console.log("hello2")
})
example.execute("test2").then(() => {
    console.log("hello3")
})
```

