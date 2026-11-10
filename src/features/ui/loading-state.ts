/** Operazioni concorrenti: completarne una non nasconde quelle ancora in corso. */
export class LoadingState {
  private serial=0;
  private readonly tasks=new Map<number,string>();
  constructor(private readonly changed:()=>void=()=>undefined){}
  get active():boolean{return this.tasks.size>0;}
  get label():string{return [...this.tasks.values()].at(-1)??'';}
  begin(label:string):()=>void{
    const id=++this.serial;this.tasks.set(id,label);this.changed();
    return()=>{if(this.tasks.delete(id))this.changed();};
  }
  async run<T>(label:string,operation:()=>Promise<T>):Promise<T>{
    const finish=this.begin(label);try{return await operation();}finally{finish();}
  }
}
