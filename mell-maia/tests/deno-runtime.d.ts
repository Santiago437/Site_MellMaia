/** Minimum ambient surface for local tsc checks; deployment uses native Deno. */
declare namespace Deno {
 const env:{get(name:string):string|undefined};
 function serve(handler:(request:Request)=>Response|Promise<Response>):unknown;
}
