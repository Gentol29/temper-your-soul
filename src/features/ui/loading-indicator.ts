import {el} from './dom';
import {LoadingState} from './loading-state';
import './loading-indicator.css';

/** Indicatore indeterminato, inline o sovrapposto; termina quando termina l'operazione. */
export class LoadingIndicator {
  readonly root=el('div','loading-indicator hidden');
  private readonly label=el('span');
  readonly state=new LoadingState(()=>this.render());
  constructor(overlay=false){
    this.root.setAttribute('role','status');this.root.setAttribute('aria-live','polite');
    const spinner=el('span','loading-spinner');spinner.setAttribute('aria-hidden','true');
    this.root.append(spinner,this.label);if(overlay)this.root.classList.add('loading-overlay');
  }
  private render():void{this.root.classList.toggle('hidden',!this.state.active);this.root.setAttribute('aria-busy',String(this.state.active));this.label.textContent=this.state.label;}
  begin(label:string):()=>void{return this.state.begin(label);}
  run<T>(label:string,operation:()=>Promise<T>):Promise<T>{return this.state.run(label,operation);}
}
let overlay:LoadingIndicator|undefined;
export function applicationLoading():LoadingIndicator{
  if(!overlay){overlay=new LoadingIndicator(true);document.body.append(overlay.root);}
  return overlay;
}
