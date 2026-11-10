import {loginWithPassword, signupWithPassword} from '../network/account-session';
import {el} from './dom';
import {applicationLoading} from './loading-indicator';

/** Credenziali usate solo durante l'accesso; nessun salvataggio nel personaggio o nello storage. */
export function accountLoginForm(): HTMLFormElement {
  const form = el('form', 'account-login-form');
  const email = el('input'), password = el('input'), confirmation = el('input');
  const emailLabel = el('label', '', 'Email'), passwordLabel = el('label', '', 'Password');
  const confirmationLabel = el('label', '', 'Conferma password');
  email.type = 'email'; email.name = 'email'; email.id = 'account-email'; email.autocomplete = 'username'; email.required = true; email.maxLength = 254;
  password.type = confirmation.type = 'password'; password.name = 'password'; password.id = 'account-password';
  password.required = true; password.maxLength = confirmation.maxLength = 4096;
  confirmation.name = 'password-confirmation'; confirmation.id = 'account-password-confirmation'; confirmation.autocomplete = 'new-password';
  emailLabel.htmlFor = email.id; passwordLabel.htmlFor = password.id; confirmationLabel.htmlFor = confirmation.id;
  const submit = el('button', 'relic-button', 'Accedi'); submit.type = 'submit';
  const toggle = el('button', 'relic-button secondary', 'Crea account'); toggle.type = 'button';
  const help = el('p', 'account-login-help');
  const status = el('p', 'account-login-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  let registering = false, busy = false;
  function updateMode(): void {
    password.autocomplete = registering ? 'new-password' : 'current-password';
    password.minLength = registering ? 6 : 0; confirmation.required = registering;
    confirmation.hidden = confirmationLabel.hidden = !registering;
    submit.textContent = registering ? 'Crea account' : 'Accedi';
    toggle.textContent = registering ? 'Hai già un account? Accedi' : 'Crea account';
    help.textContent = registering ? 'Usa almeno 6 caratteri. Potrebbe essere richiesta la conferma email.' : '';
  }
  toggle.onclick = () => {
    if (busy) return;
    registering = !registering; password.value = confirmation.value = ''; confirmation.setCustomValidity(''); status.textContent = '';
    updateMode();
  };
  confirmation.oninput = password.oninput = () => confirmation.setCustomValidity('');
  form.onsubmit = event => {
    event.preventDefault(); if (busy) return;
    confirmation.setCustomValidity(registering && password.value !== confirmation.value ? 'Le password non coincidono.' : '');
    if (!form.reportValidity()) return;
    busy = true;
    for (const control of [submit, toggle, email, password, confirmation]) control.disabled = true;
    status.textContent = registering ? 'Registrazione in corso…' : 'Accesso in corso…';
    const operation = applicationLoading().run(registering?'Creazione account…':'Accesso account…',()=>registering ? signupWithPassword(email.value, password.value).then(result => {
      if (result.confirmationRequired) {
        registering = false; updateMode();
        status.textContent = 'Controlla la posta, anche lo spam: se la registrazione richiede conferma, usa il link ricevuto. Poi torna al gioco e premi Accedi. Se hai già un account, puoi accedere.';
      }
    }) : loginWithPassword(email.value, password.value));
    void operation.catch((error: unknown) => { status.textContent = error instanceof Error ? error.message : 'Operazione non riuscita.'; })
      .finally(() => {
        password.value = confirmation.value = ''; busy = false;
        for (const control of [submit, toggle, email, password, confirmation]) control.disabled = false;
      });
  };
  updateMode();
  form.append(emailLabel, email, passwordLabel, password, confirmationLabel, confirmation, help, submit, toggle, status);
  return form;
}
