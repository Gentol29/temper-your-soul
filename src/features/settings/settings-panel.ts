import type { Input } from '../../core/input';
import type { AudioPlayer } from '../audio/audio-player';
import type { KeyValueStore } from '../character/save-store';
import { AudioSettingsView } from '../ui/audio-panel';
import { el, requireElement } from '../ui/dom';
import { ControlsView } from './controls-view';
import { loadControls, saveControls } from './control-store';
import { CursorView } from './cursor-view';

const TABS = ['Audio', 'Schermo', 'Comandi', 'Cursore'] as const;
const CONTROLS_TAB = 2;
const CURSOR_TAB = 3;

/** Contenitore unico, estensibile a lingua e altre preferenze senza dipendere dalla partita. */
export class SettingsPanel {
  private readonly root = requireElement('settings-panel');
  private readonly button = requireElement('settings-button');
  private readonly controls: ControlsView;
  private readonly tabs: HTMLButtonElement[] = [];
  private readonly panes: HTMLElement[] = [];
  private readonly fullscreenButton = el('button','relic-button secondary settings-screen-action');
  private restoreFocus: HTMLElement | null = null;
  constructor(audio: AudioPlayer, private readonly input: Input, storage: KeyValueStore | null, private readonly handlers: {onOpen:()=>void;onFullscreen:()=>void;onPerformance:()=>void}) {
    loadControls(input.bindings,storage);
    const header=el('div','audio-panel-header'),close=el('button','audio-panel-close','✕');
    close.type='button';close.setAttribute('aria-label','Chiudi impostazioni');close.dataset.settingsNavigation='';close.addEventListener('click',()=>this.close());
    header.append(el('h2','','Impostazioni'),close);
    const tablist=el('div','settings-tabs');tablist.setAttribute('role','tablist');tablist.setAttribute('aria-label','Categorie delle impostazioni');
    TABS.forEach((label,index)=>{
      const tab=el('button','settings-tab',label);tab.type='button';tab.id=`settings-tab-${index}`;tab.dataset.settingsNavigation='';
      tab.setAttribute('role','tab');tab.setAttribute('aria-controls',`settings-pane-${index}`);
      const pane=el('div','settings-pane');pane.id=`settings-pane-${index}`;pane.setAttribute('role','tabpanel');pane.setAttribute('aria-labelledby',tab.id);
      tab.addEventListener('click',()=>this.select(index));
      tab.addEventListener('keydown',event=>{
        if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.code))return;
        event.preventDefault();
        const last=TABS.length-1,next=event.code==='Home'?0:event.code==='End'?last:event.code==='ArrowLeft'?(index+last)%TABS.length:(index+1)%TABS.length;
        this.select(next);this.tabs[next]!.focus();
      });
      this.tabs.push(tab);this.panes.push(pane);tablist.append(tab);
    });
    const status=el('p','settings-storage');status.setAttribute('role','status');
    this.root.replaceChildren(header,tablist,...this.panes,status);
    new AudioSettingsView(this.panes[0]!,audio);this.renderScreenPane(this.panes[1]!);this.controls=new ControlsView(this.panes[CONTROLS_TAB]!,input.bindings);new CursorView(this.panes[CURSOR_TAB]!,storage);
    input.bindings.changed.connect(()=>{status.textContent=saveControls(input.bindings,storage)?'':'Salvataggio non disponibile: associazioni valide per questa sessione.';});
    this.select(0);
    document.addEventListener('fullscreenchange',()=>this.syncScreenPane());
    window.addEventListener('pointerdown',event=>{if(this.isOpen && event.target instanceof Node && !this.root.contains(event.target) && !this.button.contains(event.target))this.close();});
    this.button.addEventListener('click',()=>this.isOpen?this.close():this.open());
    window.addEventListener('keydown',event=>{if(this.isOpen && event.code==='Escape'){event.preventDefault();event.stopImmediatePropagation();this.close();}},true);
  }
  private renderScreenPane(pane:HTMLElement):void {
    this.fullscreenButton.type='button';this.fullscreenButton.addEventListener('click',this.handlers.onFullscreen);this.syncScreenPane();
    const performance=el('button','relic-button secondary settings-screen-action','Mostra o nascondi FPS');performance.type='button';performance.addEventListener('click',this.handlers.onPerformance);
    pane.append(this.fullscreenButton,el('p','','Tasto F. Se il browser lo rifiuta, usa F11.'),performance,el('p','','Tasto F2: fotogrammi al secondo e dati di rete.'));
  }
  private syncScreenPane():void {this.fullscreenButton.textContent=document.fullscreenElement?'Esci da schermo intero':'Schermo intero';}
  get isOpen(): boolean {return !this.root.classList.contains('hidden');}
  open(): void {
    this.restoreFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
    // Nel menu la finestra e' modale: dietro non si clicca e il Tab non esce. Il clic fuori la chiude.
    requireElement('game').closest('main')!.toggleAttribute('inert',document.body.classList.contains('initial-menu'));
    this.input.releaseAll();this.input.suspended=true;this.root.classList.remove('hidden');this.button.setAttribute('aria-expanded','true');this.handlers.onOpen();this.tabs.find(tab=>tab.getAttribute('aria-selected')==='true')?.focus();
  }
  close(): void {
    requireElement('game').closest('main')!.removeAttribute('inert');
    this.controls.cancel();this.root.classList.add('hidden');this.button.setAttribute('aria-expanded','false');this.input.releaseAll();this.input.suspended=false;
    // Si torna al comando da cui si era aperto (il menu principale non mostra il pulsante in alto).
    const visible=(element:HTMLElement|null|undefined):element is HTMLElement=>Boolean(element?.isConnected&&element.offsetParent!==null);
    const back=[this.restoreFocus,this.button,document.querySelector<HTMLElement>('.forge-plate.is-primary')].find(visible);this.restoreFocus=null;back?.focus();
  }
  private select(index: number): void {
    this.controls?.cancel();this.tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;this.panes[i]!.hidden=i!==index;});
  }
}
