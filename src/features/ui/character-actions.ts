import type { CharacterCommand } from '../network/account-protocol';
/** Un unico punto per instradare le azioni UI al server quando il profilo è online. */
let online: ((command: CharacterCommand) => void) | null = null;
export function setCharacterCommandSink(sink: typeof online): void { online = sink; }
export function characterAction(command: CharacterCommand, offline: () => boolean | void): boolean {
  if (online) { online(command); return false; }
  return offline() !== false;
}
