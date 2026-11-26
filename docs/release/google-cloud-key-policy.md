# Google Cloud: allow service account keys

Written on 26 November 2026, when production setup first hit this. Google's console changes, so if a label differs a little, use the closest match.

## When you need this

Production setup creates two service account keys in the `adwam-production` project:

- the Firebase push key, in [7.2](production-setup.md#72-the-push-key)
- the Google Play upload key, in [8.2](production-setup.md#82-create-a-service-account-in-google-cloud)

Either step can fail with a message like this:

> Key creation is not allowed on this service account. Please check if service account key creation is restricted by organization policies.

## Why it happens

`adwam-production` sits inside a Google Cloud organization. Organizations created since May 2024 block service account keys by default, through the organization policy **Disable service account key creation**. The staging Firebase project isn't in an organization, so it never hit this.

Expo needs key files for both jobs, so production needs an exception. The fix turns the policy off for `adwam-production` only. Everything else in the organization stays protected.

## Avoid it next time

When you create a Firebase or Google Cloud project, keep it unlinked. If it asks for a parent resource or organization, choose **No organization**. Key creation then works as it does on staging, and you don't need this page. If the project is already linked, use the fix below.

## Don't delete the project

Fixing the policy takes a few minutes. Starting again costs more:

- A deleted project's ID can never be used again, so the new project would get an ID like `adwam-production-a1b2c`.
- You'd redo [7.1](production-setup.md#71-add-the-production-app), including a new `google-services.json`.
- Unlinking isn't an option either: Google Cloud can't move an existing project out of an organization.

## The fix

Only do this if the organization is yours. If it belongs to an employer or someone else, don't change its policies. Stop and tell an agent.

### 1. Give yourself the role that changes policies

Being the organization's administrator doesn't include this role. You grant it to yourself once.

1. Open <https://console.cloud.google.com/iam-admin/iam>.
2. At the top left, next to the Google Cloud logo, click the picker that shows a project name.
3. In the window that opens, choose your **organization**. It has a building icon and no project ID. If you only see projects, open the **All** tab, or use the organization dropdown at the top of that window.
4. Check the page title. It must say **Permissions for organization "…"**, not project. The role in the next step is only offered on the organization.
5. Click **Grant access**. **New principals:** your own Google account's email. **Role:** **Organization Policy Administrator**. Click **Save**.

### 2. Turn the policy off for `adwam-production`

1. Switch the picker back to the **adwam-production** project.
2. In the left menu, click **IAM & Admin** → **Organization Policies**, or open <https://console.cloud.google.com/iam-admin/orgpolicies>.
3. Search for **service account key creation**. There may be two entries:
   - **Disable service account key creation** (`iam.disableServiceAccountKeyCreation`)
   - the same name marked *managed* (`iam.managed.disableServiceAccountKeyCreation`)
4. For each one that shows as enforced:
   1. Click it, then **Manage policy**.
   2. **Policy source:** **Override parent's policy**.
   3. **Rules:** one rule with **Enforcement: Off**.
   4. Click **Set policy**. **Test policy** only previews the change and applies nothing.

### 3. Make the key

1. Wait a few minutes. The change takes a little while to reach Firebase.
2. Go back to the step that failed, reload the page and create the key again.

## Afterwards (optional)

Once both keys exist, you can switch the policy back on. On the same Organization Policies page, set each entry's **Policy source** back to **Inherit parent's policy** and click **Set policy**.

The policy only blocks creating new keys, so existing keys keep working. When a key needs replacing later, turn the policy off again first. You can also remove the Organization Policy Administrator role from yourself, but you'll need it again for that.

## If it still fails

| What you see | Why | Fix |
|---|---|---|
| **Organization Policy Administrator** isn't in the role list | You're granting access on the project | Pick the organization in step 1.3 |
| **Manage policy** is greyed out | The new role hasn't applied yet, or it was granted on the project | Wait a minute and reload, then check step 1.4 |
| The key error still shows after 10 minutes | One of the two entries is still enforced, or the override went to another project | Check both entries in step 2.3, with `adwam-production` in the picker |
