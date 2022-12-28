
        const _bufferMap = {}
        
            _bufferMap["init"] = new SharedArrayBuffer(1024);

            
            _bufferMap["createRegistrationOptions"] = new SharedArrayBuffer(1024);

            
            _bufferMap["finishRegistration"] = new SharedArrayBuffer(1024);

            

function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}
const _executionMap = {}
let worker;
const workerBuff = fetch("worker.js").then( async (resp) => {
    const blob = await resp.blob();
    const objUrl = URL.createObjectURL(blob);            
    worker = new Worker(objUrl, {type: "module"});
    worker.onmessage = function(e) {
        if(!_executionMap[e.data.id]) {
            return
        }
        const context = _executionMap[e.data.id]
        context.promise && context.resolve(e.data.res)
        delete _executionMap[e.data.id]
    }
});
        
async function init(args) {
                let promiseResolve, promiseReject;
                const id = uuidv4()
                const prms = new Promise((resolve, reject) => {
                    promiseResolve = resolve
                    promiseReject = reject
                });
                _executionMap[id] = {
                    promise: prms,
                    resolve: promiseResolve,
                    reject: promiseReject,
                }
                worker.postMessage({
                    name: "init",
                    id: id,
                    buffer: _bufferMap["init"],
                    args
                })
                return prms;
            }
async function createRegistrationOptions(args) {
                let promiseResolve, promiseReject;
                const id = uuidv4()
                const prms = new Promise((resolve, reject) => {
                    promiseResolve = resolve
                    promiseReject = reject
                });
                _executionMap[id] = {
                    promise: prms,
                    resolve: promiseResolve,
                    reject: promiseReject,
                }
                worker.postMessage({
                    name: "createRegistrationOptions",
                    id: id,
                    buffer: _bufferMap["createRegistrationOptions"],
                    args
                })
                return prms;
            }
async function finishRegistration(args) {
                let promiseResolve, promiseReject;
                const id = uuidv4()
                const prms = new Promise((resolve, reject) => {
                    promiseResolve = resolve
                    promiseReject = reject
                });
                _executionMap[id] = {
                    promise: prms,
                    resolve: promiseResolve,
                    reject: promiseReject,
                }
                worker.postMessage({
                    name: "finishRegistration",
                    id: id,
                    buffer: _bufferMap["finishRegistration"],
                    args
                })
                return prms;
            }
