import type { Input } from '../../core/input';
import type { AudioPlayer } from '../audio/audio-player';
import type { KeyValueStore } from '../character/save-store';
import { AudioSettingsView } from '../ui/audio-panel';
import { el, requireElement } from '../ui/dom';
import { ControlsView } from './controls-view';
import { loadControls, saveControls } from './control-store';
import { CursorView } from './cursor-view';
/** Contenitore unico, estensibile a lingua e altre preferenze senza dipendere dalla partita. */
export class SettingsPanel {
  private readonly root = requireElement('settings-panel');
  private readonly button = requireElement('settings-button');
  /** Il menu iniziale nasconde l'ingranaggio e ha un proprio pulsante. */
  private readonly menuButton = requireElement('menu-settings');
  private readonly controls: ControlsView;
  private readonly tabs: HTMLButtonElement[] = [];
  private readonly panes: HTMLElement[] = [];
  constructor(audio: AudioPlayer, private readonly input: Input, storage: KeyValueStore | null, private readonly handlers: {onOpen:()=>void}) {
    loadControls(input.bindings,storage);
    const header=el('div','audio-panel-header'),close=el('button','audio-panel-close','✕');
    close.type='button';close.setAttribute('aria-label','Chiudi impostazioni');close.dataset.settingsNavigation='';close.addEventListener('click',()=>this.close());
    header.append(el('h2','','Impostazioni'),close);
    const tablist=el('div','settings-tabs');tablist.setAttribute('role','tablist');tablist.setAttribute('aria-label','Categorie delle impostazioni');
    const labels=['Associazione tasti','Audio','Cursore'],last=labels.length-1;
    labels.forEach((label,index)=>{
      const tab=el('button','settings-tab',label);tab.type='button';tab.id=`settings-tab-${index}`;tab.dataset.settingsNavigation='';
      tab.setAttribute('role','tab');tab.setAttribute('aria-controls',`settings-pane-${index}`);
      const pane=el('div','settings-pane');pane.id=`settings-pane-${index}`;pane.setAttribute('role','tabpanel');pane.setAttribute('aria-labelledby',tab.id);
      tab.addEventListener('click',()=>this.select(index));
      tab.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.code))return;event.preventDefault();const next=event.code==='Home'?0:event.code==='End'?last:(index+(event.code==='ArrowLeft'?last:1))%labels.length;this.select(next);this.tabs[next].focus();});
      this.tabs.push(tab);this.panes.push(pane);tablist.append(tab);
    });
    const status=el('p','settings-storage');status.setAttribute('role','status');
    this.root.replaceChildren(header,tablist,...this.panes,status);
    this.controls=new ControlsView(this.panes[0],input.bindings);new AudioSettingsView(this.panes[1],audio);new CursorView(this.panes[2],storage);
    input.bindings.changed.connect(()=>{status.textContent=saveControls(input.bindings,storage)?'':'Salvataggio non disponibile: associazioni valide per questa sessione.';});
    this.select(0);
    window.addEventListener('pointerdown',event=>{if(this.isOpen && event.target instanceof Node && !this.root.contains(event.target) && !this.button.contains(event.target) && !this.menuButton.contains(event.target))this.close();});
    this.button.addEventListener('click',()=>this.isOpen?this.close():this.open());
    this.menuButton.addEventListener('click',()=>this.isOpen?this.close():this.open());
    window.addEventListener('keydown',event=>{if(this.isOpen && event.code==='Escape'){event.preventDefault();event.stopImmediatePropagation();this.close();}},true);
  }
  get isOpen(): boolean {return !this.root.classList.contains('hidden');}
  open(): void {this.input.releaseAll();this.input.suspended=true;this.root.classList.remove('hidden');this.button.setAttribute('aria-expanded','true');this.menuButton.setAttribute('aria-expanded','true');this.handlers.onOpen();this.tabs.find(tab=>tab.getAttribute('aria-selected')==='true')?.focus();}
  close(): void {this.controls.cancel();this.root.classList.add('hidden');this.button.setAttribute('aria-expanded','false');this.menuButton.setAttribute('aria-expanded','false');this.input.releaseAll();this.input.suspended=false;(this.menuButton.offsetParent===null?this.button:this.menuButton).focus();}
  private select(index: number): void {
    this.controls?.cancel();this.tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;this.panes[i].hidden=i!==index;});
  }
}
