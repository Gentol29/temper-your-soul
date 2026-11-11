import type { CharacterRoster } from '../character/character-roster';
import { CLASS_LABELS } from '../character/character-class';
import { levelProgress } from '../character/progression';
import { characterPixels } from '../presentation/character-art';
import { pixelSvg } from './character-portrait';
import { el } from './dom';

export function renderCharacterProfiles(roster:CharacterRoster,creating:boolean,handlers:{onNew:()=>void;onCancel:()=>void;onSelect:(id:string)=>void;onRemove?:(id:string)=>void}):HTMLElement {
  const root=el('section','character-profiles');root.setAttribute('aria-label','I tuoi personaggi');
  const head=el('div','profiles-heading'),add=el('button','secondary profile-new','＋ Nuovo personaggio');add.type='button';add.disabled=creating;
  add.addEventListener('click',handlers.onNew);head.append(el('h2','','Personaggi'),add);root.append(head);
  for(const profile of roster.profiles){
    const character=profile.character,row=el('div','profile-row');row.dataset.profileId=profile.id;
    const select=el('button','profile-select');select.type='button';select.setAttribute('aria-pressed',String(!creating&&profile.id===roster.activeId));
    const figure=el('span','roster-figure');figure.append(pixelSvg(characterPixels(character.appearance(),'game')));
    select.append(figure,el('strong','',character.name??'Personaggio da completare'),el('small','',`${character.characterClass?CLASS_LABELS[character.characterClass]:'Classe da scegliere'} · Livello ${levelProgress(character.totalXp).level} · ${character.gearScore} GS`));
    select.addEventListener('click',()=>handlers.onSelect(profile.id));
    const remove=el('button','small-button danger profile-remove','✕');remove.type='button';remove.title='Rimuovi';remove.setAttribute('aria-label','Rimuovi '+(character.name??'personaggio da completare'));
    remove.addEventListener('click',()=>{
      const dialog=el('dialog','profile-delete-dialog');
      dialog.append(el('h2','','Rimuovere '+(character.name??'questo personaggio')+'?'),el('p','','Verranno rimossi il personaggio, il suo inventario e i suoi progressi locali.'));
      const actions=el('div','profile-delete-actions'),cancel=el('button','secondary','Annulla'),confirm=el('button','danger','Elimina personaggio');
      cancel.type=confirm.type='button';cancel.addEventListener('click',()=>dialog.close());confirm.addEventListener('click',()=>{dialog.close();handlers.onRemove?.(profile.id);});
      actions.append(cancel,confirm);dialog.append(actions);dialog.addEventListener('close',()=>dialog.remove());
      dialog.addEventListener('keydown',event=>{if(event.code==='Escape')event.stopPropagation();});document.body.append(dialog);dialog.showModal();cancel.focus();
    });
    row.append(select);if(handlers.onRemove)row.append(remove);root.append(row);
  }
  if(creating){
    const draft=el('div','profile-row is-draft');draft.append(el('strong','','Nuovo personaggio'));
    if(roster.profiles.length){const cancel=el('button','secondary profile-cancel','Annulla');cancel.type='button';cancel.setAttribute('aria-label','Annulla creazione');cancel.addEventListener('click',handlers.onCancel);draft.append(cancel);}
    root.append(draft);
  }
  return root;
}
