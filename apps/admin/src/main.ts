import english from '@adwam/content/messages/en.json';
import { dayDiff, hijriMonthStart, type CivilDate } from '@adwam/core';
import { createClient } from '@supabase/supabase-js';

import './style.css';

type Client = ReturnType<typeof adminClient>;
type Correction = {
  id: string; countryCode: string; year: number; month: number; start: CivilDate; sourceUrl: string;
  status: 'draft' | 'published' | 'withdrawn';
};
type Draft = Omit<Correction, 'id' | 'status'>;

function element<T extends HTMLElement>(id: string) {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing admin control ${id}`);
  return node as T;
}

function adminClient(url: string, key: string) {
  return createClient(url, key, { auth: { detectSessionInUrl: false } });
}

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_KEY;
const client = url && key ? adminClient(url, key) : undefined;
const status = element<HTMLParagraphElement>('status');
const signIn = element('sign-in');
const signOut = element<HTMLButtonElement>('sign-out');
const emailForm = element<HTMLFormElement>('email-form');
const codeForm = element<HTMLFormElement>('code-form');
const workspace = element('workspace');
const editor = element<HTMLFormElement>('correction-form');
const reference = element('reference-date');
const estimate = element('estimate');
const warning = element('date-warning');
const history = element('history');
const newDraft = element<HTMLButtonElement>('new-draft');
const editorTitle = element('editor-title');
const months = english.calendar.month;
const region = new Intl.DisplayNames(['en'], { type: 'region' });
const dateFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const value = (name: string) => editor.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement;
let signingInAs = '';
let editing: string | undefined;
let busy = false;

const dateText = (date: CivilDate) => dateFormatter.format(new Date(`${date}T12:00:00Z`));

for (const [number, label] of Object.entries(months)) {
  (value('month') as HTMLSelectElement).add(new Option(label, number));
}

function announce(message: string, error = false) {
  status.textContent = message;
  status.hidden = !message;
  status.classList.toggle('error', error);
}

function work(action: (client: Client) => Promise<void>) {
  if (!client || busy) return;
  busy = true;
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('button')];
  buttons.forEach((button) => { button.disabled = true; });
  void action(client).catch(() => announce('Couldn’t complete the request. Check your connection and try again.', true))
    .finally(() => {
      buttons.forEach((button) => { button.disabled = false; });
      busy = false;
    });
}

function signedOut() {
  workspace.hidden = true;
  signOut.hidden = true;
  signIn.hidden = !client;
  emailForm.hidden = false;
  codeForm.hidden = true;
  codeForm.reset();
  history.replaceChildren();
  edit();
}

async function showWorkspace(db: Client) {
  if (!await loadHistory(db)) return;
  signIn.hidden = true;
  signOut.hidden = false;
  workspace.hidden = false;
  announce('');
  value('country').focus();
}

emailForm.addEventListener('submit', (event) => {
  event.preventDefault();
  work(async (db) => {
    const email = String(new FormData(emailForm).get('email')).trim();
    const { error } = await db.auth.signInWithOtp({
      email, options: { shouldCreateUser: false, emailRedirectTo: new URL(import.meta.env.BASE_URL, location.origin).href },
    });
    if (error) return announce('Couldn’t send a code. Check that you entered your admin email.', true);
    signingInAs = email;
    emailForm.hidden = true;
    codeForm.hidden = false;
    announce('Check your email for the sign-in code.');
    element('code').focus();
  });
});

codeForm.addEventListener('submit', (event) => {
  event.preventDefault();
  work(async (db) => {
    const token = String(new FormData(codeForm).get('code')).trim();
    const { error } = await db.auth.verifyOtp({ type: 'email', email: signingInAs, token });
    if (error) return announce('That code didn’t work. Check it or request another code.', true);
    codeForm.reset();
    await showWorkspace(db);
  });
});

element('change-email').addEventListener('click', () => {
  codeForm.reset();
  codeForm.hidden = true;
  emailForm.hidden = false;
  announce('');
  element('email').focus();
});

signOut.addEventListener('click', () => work(async (db) => {
  const { error } = await db.auth.signOut({ scope: 'local' });
  if (error) return announce('Couldn’t sign out. Try again.', true);
  signedOut();
  announce('');
}));

function referenceDate() {
  const year = Number(value('year').value);
  const month = Number(value('month').value);
  if (!Number.isInteger(year) || year < 1 || year > 9999 || month < 1 || month > 12) return;
  const result = hijriMonthStart(year, month, { method: 'umalqura' });
  return /^\d{4}-\d{2}-\d{2}$/.test(result) ? result : undefined;
}

function dateCheck() {
  const calculated = referenceDate();
  reference.textContent = calculated ? dateText(calculated) : '—';
  estimate.textContent = '—';
  const start = value('start').value as CivilDate;
  const difference = calculated && /^\d{4}-\d{2}-\d{2}$/.test(start) ? Math.abs(dayDiff(calculated, start)) : 0;
  warning.hidden = difference <= 2;
  warning.textContent = difference > 2 ? `This date is ${difference} days from Umm al-Qura. Check the announcement before publishing.` : '';
}

function edit(correction?: Correction) {
  editing = correction?.id;
  newDraft.hidden = !correction;
  editorTitle.textContent = correction ? 'Edit correction draft' : 'New correction';
  editor.reset();
  if (correction) {
    value('country').value = correction.countryCode;
    value('year').value = String(correction.year);
    value('month').value = String(correction.month);
    value('start').value = correction.start;
    value('source').value = correction.sourceUrl;
  }
  dateCheck();
}

newDraft.addEventListener('click', () => { edit(); value('country').focus(); });
editor.addEventListener('input', dateCheck);

async function loadHistory(db: Client) {
  const { data, error } = await db.rpc('list_corrections_v1');
  if (error?.code === '42501') {
    await db.auth.signOut({ scope: 'local' });
    signedOut();
    announce('This account isn’t a correction admin.', true);
    return false;
  }
  if (error) {
    announce('Couldn’t load corrections. Try again after checking your connection.', true);
    return false;
  }
  const corrections: Correction[] = data;
  history.replaceChildren(...corrections.map((correction) => historyItem(db, correction)));
  if (!corrections.length) {
    const empty = document.createElement('li');
    empty.textContent = 'No corrections yet.';
    history.append(empty);
  }
  return true;
}

function historyItem(db: Client, correction: Correction) {
  const row = document.createElement('li');
  row.className = 'history-row';
  const details = document.createElement('div');
  const title = document.createElement('strong');
  const month = months[String(correction.month) as keyof typeof months];
  title.textContent = `${month} ${correction.year} · ${region.of(correction.countryCode) ?? correction.countryCode}`;
  const date = document.createElement('p');
  date.className = 'history-date';
  date.textContent = `${dateText(correction.start)} · ${correction.status}`;
  details.append(title, date);
  if (/^https?:\/\//.test(correction.sourceUrl)) {
    const source = document.createElement('a');
    source.textContent = 'Announcement source';
    source.href = correction.sourceUrl;
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    details.append(source);
  }
  row.append(details);
  if (correction.status === 'withdrawn') return row;
  const button = document.createElement('button');
  button.className = 'secondary';
  button.textContent = correction.status === 'draft' ? 'Edit draft' : 'Withdraw';
  button.addEventListener('click', () => {
    if (correction.status === 'draft') {
      edit(correction);
      value('country').focus();
      return;
    }
    if (!confirm('Withdraw this correction? Phones will unpin it on their next sync.')) return;
    work(async () => {
      const { error } = await db.rpc('withdraw_correction_v1', { correction_id: correction.id });
      if (error) return announce('Couldn’t withdraw the correction. Try again.', true);
      if (await loadHistory(db)) announce('Correction withdrawn.');
    });
  });
  row.append(button);
  return row;
}

editor.addEventListener('submit', (event) => {
  event.preventDefault();
  const action = (event as SubmitEvent).submitter?.getAttribute('value');
  work(async (db) => {
    const draft: Draft = {
      countryCode: value('country').value.trim().toUpperCase(), year: Number(value('year').value), month: Number(value('month').value),
      start: value('start').value as CivilDate, sourceUrl: value('source').value.trim(),
    };
    const reference = referenceDate();
    if (!reference || !/^https?:\/\//.test(draft.sourceUrl)) return announce('Enter a valid month and an http or https source link.', true);
    if (action === 'publish' && Math.abs(dayDiff(reference, draft.start)) > 2 &&
      !confirm('The date differs from Umm al-Qura by more than two days. Publish this correction?')) return;
    const saved = await db.rpc('draft_correction_v1', {
      country: draft.countryCode, year: draft.year, month: draft.month, starts_on: draft.start, source_url: draft.sourceUrl,
      ...(editing && { correction_id: editing }),
    });
    if (saved.error) return announce('Couldn’t save the correction. Check the fields and try again.', true);
    edit(saved.data);
    if (action === 'estimate') {
      const result = await db.rpc('estimate_correction_v1', {
        correction_id: editing, umalqura_start: reference, civil_start: hijriMonthStart(draft.year, draft.month, { method: 'civil' }),
      });
      if (result.error) return announce('Couldn’t estimate the affected installs. The draft is saved.', true);
      estimate.textContent = String(result.data);
      if (await loadHistory(db)) announce('Estimate updated.');
    } else if (action === 'publish') {
      const published = await db.functions.invoke('publish-correction', {
        body: { correctionId: editing, confirmUnusualDate: Math.abs(dayDiff(reference, draft.start)) > 2 },
      });
      if (published.error || published.data?.confirmationRequired) {
        await loadHistory(db);
        return announce('The correction wasn’t published. Review the saved draft and try again.', true);
      }
      edit();
      if (await loadHistory(db)) announce(`Correction published. ${published.data.queued} ${published.data.queued === 1 ? 'push queued' : 'pushes queued'}.`);
    } else if (await loadHistory(db)) {
      announce('Draft saved.');
    }
  });
});

if (!client) {
  announce('The staging server connection is unavailable.', true);
} else {
  signedOut();
  work(async (db) => {
    const { data, error } = await db.auth.getSession();
    if (error) return announce('Couldn’t restore the session. Sign in again to continue.', true);
    if (data.session) await showWorkspace(db);
  });
}
