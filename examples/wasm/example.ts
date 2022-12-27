import { WasmInstanceWrapper, WasmWorkerDefinition } from "./../../src/WasmInstanceWrapper.ts";
import { sleep } from "https://deno.land/x/sleep/mod.ts";
class Example extends WasmWorkerDefinition {

    public constructor(modulePath: string) {
        super(modulePath);
    }

    public init(buffer: SharedArrayBuffer, module: any) {
        console.log("initalizing webauthn instance...")
        const options = {
            RPDisplayName: "localhost",
            RPID: "locahost",
            RPOrigin: "http://localhost:8080",
            RPIcon: "",
            AttestationPreference: "direct",
            AuthenticatorSelection: {
                AuthenticatorAttachment: "platform",
                RequireResidentKey: true,
                UserVerification: "required"
            }
        };

        //@ts-ignore
        self.WebAuthnGoJS.CreateContext(JSON.stringify(options), function(arg, msg){
            console.log(arg);
            console.log(msg);
        });

        return buffer
    }

    /*
	ID          uint64                `json:"id"`
	Name        string                `json:"name"`
	DisplayName string                `json:"displayName"`
	Credentials []webauthn.Credential `json:"credentials"`
    */
    public createRegistrationOptions(buffer: SharedArrayBuffer, module: any, args: any): Promise<any>  {
        console.log("beginning registration")
        
        const user = {
            id: 1,
            name: args.name,
            displayName: "foo",
            credentials: []
        }
        let result;
        //@ts-ignore
        self.WebAuthnGoJS.BeginRegistration(JSON.stringify(user), (err, msg) => {
            console.log(err);
            console.log(msg);
            result = msg;     
        });


        return result;
    }

    public finishRegistration(buffer: SharedArrayBuffer, module: any, args: any): void {
        

    }
}

const example: WasmWorkerDefinition = new Example("./examples/wasm/main.wasm");

const wrapper: WasmInstanceWrapper<Example> = new WasmInstanceWrapper<Example>(example as Example, {
    outputPath: 'test-server/public'
});

wrapper.Create({
    writeFileSync: Deno.writeFileSync
});
