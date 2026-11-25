import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reminderMarker, reminderTitle, syncPreviewReminder } from './preview-reminder.mjs';

const runtime = 'a'.repeat(40);
const otherRuntime = 'b'.repeat(40);
const buildId = '18d7dc7c-1dca-470f-b4c2-ecbaa08dc766';
const context = { repo: { owner: 'MSalman5230', repo: 'adwam' }, sha: 'c0ffee1234567890' };

function fakeGitHub(issues) {
  const calls = [];
  const record = (name) => async (args) => { calls.push({ name, ...args }); return { data: {} }; };
  return {
    calls,
    paginate: async () => issues,
    rest: {
      issues: {
        listForRepo: () => {},
        create: record('create'),
        update: record('update'),
        createComment: record('comment'),
      },
    },
  };
}

const reminder = (number, body) => ({ number, body: `${reminderMarker}\n${body}` });

test('a runtime without a Preview build opens one reminder', async () => {
  const github = fakeGitHub([{ number: 1, body: 'Unrelated issue' }, { number: 2, body: reminderMarker, pull_request: {} }]);
  assert.equal(await syncPreviewReminder({ github, context, runtime }), 'opened');
  assert.equal(github.calls.length, 1);
  assert.equal(github.calls[0].name, 'create');
  assert.equal(github.calls[0].title, reminderTitle);
  assert.match(github.calls[0].body, new RegExp(`\`${runtime}\``));
  assert.match(github.calls[0].body, /c0ffee1/);
  assert.match(github.calls[0].body, /actions\/workflows\/preview-build\.yml/);
});

test('an open reminder for the same runtime is left alone', async () => {
  const github = fakeGitHub([reminder(5, `runtime \`${runtime}\``)]);
  assert.equal(await syncPreviewReminder({ github, context, runtime }), 'open');
  assert.equal(github.calls.length, 0);
});

test('a later native change updates the open reminder and closes duplicates', async () => {
  const github = fakeGitHub([reminder(5, `runtime \`${otherRuntime}\``), reminder(6, 'duplicate')]);
  assert.equal(await syncPreviewReminder({ github, context, runtime }), 'updated');
  assert.deepEqual(github.calls.map(({ name, issue_number, state }) => [name, issue_number, state]), [
    ['update', 6, 'closed'],
    ['update', 5, undefined],
  ]);
  assert.match(github.calls[1].body, new RegExp(runtime));
});

test('a matching build closes every reminder with a link to it', async () => {
  const github = fakeGitHub([reminder(5, 'first'), reminder(6, 'second')]);
  assert.equal(await syncPreviewReminder({ github, context, runtime, buildId }), 'closed');
  assert.deepEqual(github.calls.map(({ name, issue_number }) => [name, issue_number]), [
    ['comment', 5], ['update', 5], ['comment', 6], ['update', 6],
  ]);
  assert.match(github.calls[0].body, new RegExp(`builds/${buildId}`));
});

test('a matching build with no reminder does nothing', async () => {
  const github = fakeGitHub([]);
  assert.equal(await syncPreviewReminder({ github, context, runtime, buildId }), 'none');
  assert.equal(github.calls.length, 0);
});

test('malformed inputs are rejected before GitHub is called', async () => {
  const github = fakeGitHub([]);
  await assert.rejects(syncPreviewReminder({ github, context, runtime: 'abc' }), /runtime fingerprint/);
  await assert.rejects(syncPreviewReminder({ github, context, runtime, buildId: 'bad' }), /EAS build ID/);
  assert.equal(github.calls.length, 0);
});
