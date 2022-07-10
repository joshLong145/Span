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
        let arr = new Int8Array(buffer);
        for (let i = 0; i < 10; i ++) {
            console.log("hello world")
        }
    
        return arr
    }
}

const wraper: InstanceWrapper<Example> = new InstanceWrapper<Example>(new Example(), {
    outputPath: 'output'
});

wraper.Create({
    writeFileSync: Deno.writeFileSync
});
