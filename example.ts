const { args } = Deno;
import { WorkerDefinition } from "./base/worker.ts";
import { InstanceWrapper } from "./base/InstanceWrapper.ts";

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

const wraper: InstanceWrapper<Example> = new InstanceWrapper<Example>(new Example(), {
    outputPath: 'output'
});

wraper.Create({
    writeFileSync: Deno.writeFileSync
});
