// Keeps one open issue while master's Android runtime has no finished Preview build.
// Called from actions/github-script in Deploy staging and Android preview build.

export const reminderTitle = 'Preview needs a new build';
export const reminderMarker = '<!-- adwam-preview-build-reminder -->';

const runtimePattern = /^[a-f0-9]{40}$/;
const buildIdPattern = /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const buildPage = (id) => `https://expo.dev/accounts/msalman5230/projects/adwam/builds/${id}`;

export function reminderBody({ runtime, sha, buttonUrl }) {
  return [
    reminderMarker,
    `The native code on \`master\` changed in ${sha.slice(0, 7)}, and no Preview build has runtime \`${runtime}\` yet.`,
    '',
    'Preview phones keep their current app and stop receiving updates from this commit onward until they install a new Preview build.',
    '',
    `Press **Run workflow** on [Android preview build](${buttonUrl}). This issue closes when a matching build exists.`,
  ].join('\n');
}

export async function syncPreviewReminder({ github, context, runtime, buildId }) {
  if (!runtimePattern.test(runtime ?? '')) throw new Error('Expected a 40-character Android runtime fingerprint.');
  if (buildId && !buildIdPattern.test(buildId)) throw new Error('Expected an EAS build ID.');

  const repository = context.repo;
  const open = await github.paginate(github.rest.issues.listForRepo, { ...repository, state: 'open', per_page: 100 });
  const reminders = open.filter((issue) => !issue.pull_request && issue.body?.includes(reminderMarker));

  if (buildId) {
    for (const issue of reminders) {
      await github.rest.issues.createComment({
        ...repository,
        issue_number: issue.number,
        body: `[Preview build](${buildPage(buildId)}) matches runtime \`${runtime}\`.`,
      });
      await github.rest.issues.update({ ...repository, issue_number: issue.number, state: 'closed', state_reason: 'completed' });
    }
    return reminders.length ? 'closed' : 'none';
  }

  const buttonUrl = `https://github.com/${repository.owner}/${repository.repo}/actions/workflows/preview-build.yml`;
  const body = reminderBody({ runtime, sha: context.sha, buttonUrl });
  const [current, ...duplicates] = reminders;
  for (const issue of duplicates) {
    await github.rest.issues.update({ ...repository, issue_number: issue.number, state: 'closed', state_reason: 'not_planned' });
  }
  if (current) {
    if (current.body.includes(`\`${runtime}\``)) return 'open';
    await github.rest.issues.update({ ...repository, issue_number: current.number, body });
    return 'updated';
  }
  await github.rest.issues.create({ ...repository, title: reminderTitle, body });
  return 'opened';
}
