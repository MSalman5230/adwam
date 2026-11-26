# Production setup

The owner does this once, before merging the first Release PR. It creates the production server, connects each service to it, and tells GitHub how to deploy to it. Set aside about two hours. You can stop between parts and carry on later.

[CI and releases](ci-and-release.md) explains what the pipeline does with all this. This page only gives the steps.

## Before you start

- **Sign in first.** Open these sites in one browser: GitHub (as MSalman5230), Supabase, expo.dev, Firebase, Google Cloud and Play Console (the same Google account for the last three), Sentry and PostHog.
- **Secrets go straight from one site to another.** Copy a value in one tab and paste it into the place this page names. Never paste a secret into a chat, an email, a note or a file in the repository.
- **Most sites show a secret only once.** Keep its tab open until you've pasted it into every place listed for it. If you lose one, create a new one and paste it over the old value. Nothing breaks.
- **Type names exactly.** Anything in `code style`, such as `EXPO_TOKEN`, must be typed exactly as shown, capitals included. Button labels change as sites are updated, so if one differs a little, use the closest match.
- **Agents can't do this for you.** Their rules forbid them to change production. When you're done, tell an agent and it will check everything.

## Where everything ends up

When you've finished, each place below holds these values. The last column is the step that creates each value.

**GitHub, environment `production`**

| Kind | Name | Value | Step |
|---|---|---|---|
| Secret | `SUPABASE_DB_PASSWORD` | The production database password | [2.1](#21-create-the-project-and-save-its-password) |
| Variable | `SUPABASE_PROJECT_ID` | The production project ID | [2.2](#22-copy-the-project-id) |
| Secret | `SUPABASE_ACCESS_TOKEN` | The Supabase deploy token | [2.3](#23-create-the-deploy-token) |
| Secret | `EXPO_TOKEN` | The Expo build robot's token | [3.1](#31-the-build-robot) |
| Secret | `SENTRY_AUTH_TOKEN` | A new Sentry organization token | [4.3](#43-a-new-organization-token) |
| Variable | `SENTRY_ORG` | The Sentry organization slug, the same as in `staging` | [4.4](#44-the-organization-and-project-slugs) |
| Variable | `SENTRY_PROJECT` | `adwam-production` | [4.4](#44-the-organization-and-project-slugs) |

**GitHub, environment `production-monitor`**

| Kind | Name | Value | Step |
|---|---|---|---|
| Secret | `SUPABASE_ACCESS_TOKEN` | The Supabase read-only token | [2.4](#24-create-the-read-only-token) |
| Secret | `EXPO_TOKEN` | The Expo Viewer robot's token | [3.2](#32-the-viewer-robot) |
| Variable | `SUPABASE_PROJECT_ID` | The production project ID, the same as in `production` | [9.1](#91-switch-production-on) |

**Supabase, the production project's Edge Function secrets**

| Name | Value | Step |
|---|---|---|
| `EXPO_ACCESS_TOKEN` | The Expo push token | [3.3](#33-the-push-token) |
| `SENTRY_DSN` | The `adwam-production` DSN | [4.5](#45-the-dsn) |
| `ADWAM_JOB_KEY` | The key the scheduler setup creates | [9.4](#94-save-the-job-key) |

**Expo, the adwam project's environment variables, Production only**

| Name | Visibility | Value | Step |
|---|---|---|---|
| `SENTRY_AUTH_TOKEN` | Secret | The same Sentry token as in GitHub | [4.3](#43-a-new-organization-token) |
| `SENTRY_ORG` | Plain text | The Sentry organization slug, the same as Preview's | [4.4](#44-the-organization-and-project-slugs) |
| `SENTRY_PROJECT` | Plain text | `adwam-production` | [4.4](#44-the-organization-and-project-slugs) |
| `EXPO_PUBLIC_SENTRY_DSN` | Sensitive | The `adwam-production` DSN | [4.5](#45-the-dsn) |
| `EXPO_PUBLIC_POSTHOG_KEY` | Plain text | The PostHog project token | [5](#part-5-posthog-usage-statistics) |
| `GOOGLE_SERVICES_JSON` | Secret, file | The production app's `google-services.json`, from Firebase project `adwam-production` | [7.1](#71-add-the-production-app) |

`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY` aren't on the list, because the production workflows set them.

**Expo, the adwam project's credentials for `com.msalman5230.adwam`**

| Credential | Step |
|---|---|
| Android upload keystore | [6](#part-6-the-upload-key) |
| FCM V1 service account key | [7.2](#72-the-push-key) |
| Google service account key for Expo Submit | [8.4](#84-give-the-key-to-expo) |

## How to paste into each place

Later steps say where a value goes, for example "Paste it as GitHub `production` secret `EXPO_TOKEN`". These are the clicks for each kind of place.

### A. GitHub secret

1. Open <https://github.com/MSalman5230/adwam/settings/environments>.
2. Click the environment the step names: `production` or `production-monitor`.
3. Scroll to **Environment secrets** and click **Add environment secret**.
4. **Name:** type the name exactly, for example `EXPO_TOKEN`.
5. **Value:** paste the value, with no space or new line before or after it.
6. Click **Add secret**.

GitHub never shows the value again. To replace it, click the pencil next to the secret, paste the new value and click **Update secret**.

### B. GitHub variable

1. Open the same environment page as in [A](#a-github-secret).
2. Scroll to **Environment variables** and click **Add environment variable**.
3. Fill in **Name** and **Value**, then click **Add variable**.

Variables aren't secret, so GitHub keeps showing their values. To change one, click its pencil.

### C. Supabase Edge Function secret

1. Open <https://supabase.com/dashboard/projects> and click the **production** project. Check the project name at the top of the page, so you don't change staging by mistake.
2. In the left menu, click **Edge Functions**, then **Secrets**.
3. **Key:** type the name exactly, for example `SENTRY_DSN`. **Value:** paste the value.
4. Click **Save**.

### D. Expo variable

1. Open <https://expo.dev/accounts/msalman5230/projects/adwam/environment-variables>.
2. Click **Add Variables**.
3. **Name:** type the name exactly.
4. **Value:** paste the value. For `GOOGLE_SERVICES_JSON`, choose a file value instead of text and upload the file.
5. **Environments:** tick **Production** only. Leave Development and Preview unticked. Preview already has its own values, and changing them affects testers' phones.
6. **Visibility:** the one the step names: **Plain text**, **Sensitive** or **Secret**.
7. Save.

If Expo says the name already exists, the existing variable belongs to Preview:

- For `SENTRY_AUTH_TOKEN` and `SENTRY_ORG`, open the existing variable, tick **Production** as well as Preview, and save without changing its value. Both work for either Sentry project.
- For `SENTRY_PROJECT` and `EXPO_PUBLIC_SENTRY_DSN`, stop and ask an agent. Preview's values point to `adwam-staging`, so sharing them would send production's crash reports there.
- For `GOOGLE_SERVICES_JSON`, stop and ask an agent. Preview's file comes from Preview's Firebase project, not `adwam-production`.

### E. Expo Android credential

1. Open <https://expo.dev/accounts/msalman5230/projects/adwam/credentials>.
2. Under **Android**, click `com.msalman5230.adwam`. If it isn't listed, do [Part 6](#part-6-the-upload-key) first, which adds it. Don't use **Add application identifier**: that form asks for a keystore that Part 6 creates. Don't use `com.msalman5230.adwam.preview`. That's the test app.
3. Under **Service credentials**, find the section the step names and click its add button.
4. Keep **Upload new key** selected, choose the JSON file and click **Save**.

## Part 1. GitHub environment rules

The `production` and `production-monitor` environments exist, but they have no rules yet. Until they do, a production run wouldn't wait for your approval.

### 1.1 `production`

1. Open <https://github.com/MSalman5230/adwam/settings/environments> and click `production`.
2. Under **Deployment protection rules**:
   1. Tick **Required reviewers**. In the box that appears, type `MSalman5230` and choose yourself.
   2. Leave **Prevent self-review** unticked. You start every production run yourself, and with it ticked you couldn't approve them.
   3. Untick **Allow administrators to bypass configured protection rules**. You're the administrator, so this makes the approval apply to you too.
   4. Click **Save protection rules**.
3. Under **Deployment branches and tags**:
   1. Open the dropdown that says **No restriction** and choose **Selected branches and tags**.
   2. Click **Add deployment branch or tag rule**.
   3. **Ref type:** Branch. **Name pattern:** `master`.
   4. Click **Add rule**.

The page now shows you as the one required reviewer, and `master` as the only branch.

### 1.2 `production-monitor`

This environment runs checks that change nothing, so it doesn't need your approval.

1. Go back to the list of environments and click `production-monitor`.
2. Leave **Required reviewers** unticked.
3. Under **Deployment branches and tags**, add the same `master` rule as in 1.1, step 3.

## Part 2. Supabase: the production project and its tokens

### 2.1 Create the project and save its password

1. Open <https://supabase.com/dashboard/new>.
2. Fill in the form:
   - **Organization:** the one your staging project is in.
   - **Project name:** `adwam-production`.
   - **Database password:** click **Generate a password**, then copy it.
   - **Region:** the same region as your staging project.
   - **Plan:** Free.
   - Leave every other option as it is.
3. Before you create the project, paste the password as GitHub `production` secret `SUPABASE_DB_PASSWORD` ([how](#a-github-secret)).
4. Back in Supabase, click **Create new project**. It takes a minute or two to start.

The free plan allows two active projects. If Supabase refuses, another free project in the organization is using the second one.

If you lose the password later, reset it: production project → **Project Settings** → **Database** → **Reset database password**. Then replace the GitHub secret.

### 2.2 Copy the project ID

1. In the production project, click **Project Settings** at the bottom of the left menu, then **General**.
2. Copy the **Project ID**. It's 20 lowercase letters and digits, and it also appears after `/project/` in the browser's address bar.
3. Paste it as GitHub `production` variable `SUPABASE_PROJECT_ID` ([how](#b-github-variable)).

Keep the ID handy. You'll need it again in 9.1 and 9.3. It isn't secret.

### 2.3 Create the deploy token

GitHub uses this token to deploy the database and Edge Functions to production. It can't do anything else.

1. Open <https://supabase.com/dashboard/account/tokens>. You made the staging token on this page.
2. Click **Generate new token**. If Supabase asks what kind, choose a scoped token.
3. Fill in the form:
   - **Name:** `adwam-production-deploy`
   - **Expiry:** the longest option offered.
   - **Project:** only `adwam-production`. Not staging, and not all projects.
   - **Permissions:** exactly these, and no others:

     | Permission | Level |
     |---|---|
     | Project Settings | Read |
     | API Keys | Read |
     | API Key Secrets | Read |
     | Migrations | Read |
     | Database | Read |
     | Edge Functions | Read-write |
     | Auth Config | Read-write |

4. Generate the token and copy it. It starts with `sbp_`, and Supabase shows it only once.
5. Paste it as GitHub `production` secret `SUPABASE_ACCESS_TOKEN` ([how](#a-github-secret)).
6. Add a calendar reminder for a week before it expires. To renew it, repeat these steps and replace the GitHub secret.

### 2.4 Create the read-only token

The plans and the daily health check use this token. They run without your approval, so it can only read.

1. On the same page, generate another scoped token:
   - **Name:** `adwam-production-monitor`
   - **Expiry:** the longest option offered.
   - **Project:** only `adwam-production`.
   - **Permissions:** **Database** on Read and **API Keys** on Read, and no others.
2. Copy it and paste it as GitHub `production-monitor` secret `SUPABASE_ACCESS_TOKEN` ([how](#a-github-secret)).
3. Add a calendar reminder for its expiry too.

Both tokens go into secrets named `SUPABASE_ACCESS_TOKEN`, in different environments. The deploy token goes into `production`, and the read-only token goes into `production-monitor`.

## Part 3. Expo: two robots and a push token

All three are made on <https://expo.dev/accounts/msalman5230/settings/access-tokens>.

### 3.1 The build robot

GitHub uses it to build the Play app, publish over-the-air updates and send builds to Play.

1. In the robot users section, add a robot:
   - **Name:** `adwam-production-ci`
   - **Role:** the same role as your staging robot, which the list shows next to it. If you aren't sure, choose **Developer**.
2. Create an access token for the new robot, name it `github-production`, and copy it.
3. Paste it as GitHub `production` secret `EXPO_TOKEN` ([how](#a-github-secret)).

### 3.2 The Viewer robot

The plans use it to look up builds and updates. It can't change anything.

1. Add another robot, named `adwam-production-monitor`, with the **Viewer** role.
2. Create a token for it, name it `github-production-monitor`, and copy it.
3. Paste it as GitHub `production-monitor` secret `EXPO_TOKEN` ([how](#a-github-secret)).

### 3.3 The push token

The production server uses this token to send notifications.

1. On the same page, check that the enhanced security setting for push notifications is on. If it's off, turn it on. It covers the whole account, and staging's server already has its token.
2. In the personal access tokens section, create a token named `adwam-production-push` and copy it. Staging's server uses the same kind of token.
3. Paste it as Supabase production Edge Function secret `EXPO_ACCESS_TOKEN` ([how](#c-supabase-edge-function-secret)).

## Part 4. Sentry: crash reports

Production gets its own Sentry project, `adwam-production`. Preview and the staging server keep `adwam-staging`. Test crashes then never mix with real users' crashes, and the crash-free numbers you check before raising a rollout count production only.

### 4.1 Create the production project

1. In Sentry, click **Projects** in the left menu, then **Create Project**.
2. **Platform:** Expo. If Sentry doesn't offer Expo, choose React Native. Both use the same library.
3. **Alert frequency:** leave the default.
4. **Project name:** `adwam-production`. **Team:** the same team as `adwam-staging`.
5. Click **Create Project**. Skip the setup instructions Sentry shows next. The app is already set up.
6. Check the address bar. It contains `/adwam-production/`, which is the project's slug. If it shows a different name, use that name wherever this page says `adwam-production`.

### 4.2 Copy the privacy settings

Each Sentry project has its own privacy settings, so the new project doesn't get staging's.

1. Click **Settings** → **Projects** → `adwam-staging` → **Security & Privacy**. Open the same page for `adwam-production` in another tab.
2. Make every switch on `adwam-production` match `adwam-staging`. These three must be on: **Data Scrubber**, **Use Default Scrubbers** and **Prevent Storing of IP Addresses**.
3. If staging lists extra sensitive fields or scrubbing rules, add the same ones to production.

A switch that is on and greyed out is set for the whole organization. Leave it as it is.

### 4.3 A new organization token

One token can upload to both projects. Production gets its own, so you can replace one without breaking the other.

1. In Sentry, click **Settings** in the left menu, then **Developer Settings** → **Organization Tokens**.
2. Click **Create New Token**, name it `adwam-production` and create it.
3. Copy the token. It starts with `sntrys_`, and Sentry shows it only once.
4. Paste it into both places:
   - GitHub `production` secret `SENTRY_AUTH_TOKEN` ([how](#a-github-secret))
   - Expo variable `SENTRY_AUTH_TOKEN`, visibility **Secret** ([how](#d-expo-variable))

### 4.4 The organization and project slugs

The organization is the same as staging's, and the project is the new one. Neither value is secret.

1. Open <https://github.com/MSalman5230/adwam/settings/environments> and click `staging`. Under **Environment variables**, copy the value of `SENTRY_ORG`.
2. Add it to both places:
   - GitHub `production` variable `SENTRY_ORG` ([how](#b-github-variable))
   - Expo variable `SENTRY_ORG`, visibility **Plain text** ([how](#d-expo-variable))
3. Add `SENTRY_PROJECT` with the value `adwam-production` to both places:
   - GitHub `production` variable `SENTRY_PROJECT` ([how](#b-github-variable))
   - Expo variable `SENTRY_PROJECT`, visibility **Plain text** ([how](#d-expo-variable))

Don't copy staging's `SENTRY_PROJECT`. It's `adwam-staging`, so production's source maps would go to the wrong project and its crash reports would show unreadable code.

### 4.5 The DSN

1. In Sentry, click **Settings** → **Projects** → `adwam-production` → **Client Keys (DSN)**. Check the project name at the top of the page: staging's DSN would send production's crashes to `adwam-staging`.
2. Copy the **DSN**. Its host ends in `ingest.de.sentry.io`.
3. Paste it into both places:
   - Expo variable `EXPO_PUBLIC_SENTRY_DSN`, visibility **Sensitive** ([how](#d-expo-variable))
   - Supabase production Edge Function secret `SENTRY_DSN` ([how](#c-supabase-edge-function-secret))

## Part 5. PostHog: usage statistics

1. Open <https://eu.posthog.com> and sign in, or sign up. If PostHog asks for a region, choose **EU**. The address must start with `eu.`.
2. Create a project named `Adwam`, unless PostHog made one when you signed up.
3. Set the privacy options before you copy the key:
   1. **Settings** → **Project** → **General** → **IP data capture configuration:** choose to discard IP data.
   2. **Data pipelines** → **Transformations:** find **GeoIP** and turn it off.
   3. **Settings** → **Project** → **Session replay:** leave recording off.
4. On **Settings** → **Project** → **General**, copy the **Project token**. Older screens call it the Project API key. It starts with `phc_`.
5. Paste it as Expo variable `EXPO_PUBLIC_POSTHOG_KEY`, visibility **Plain text** ([how](#d-expo-variable)).

The key is public, because the app contains it. Nothing reaches PostHog unless a user agrees in the app.

## Part 6. The upload key

Google Play only accepts builds signed with Adwam's upload key. EAS creates and stores it, but the first time it has to ask a person, so GitHub can't do it. You do this once, on this PC.

This step also adds `com.msalman5230.adwam` to Expo's credentials page. Parts 7 and 8 add keys there, so do this first.

1. Open PowerShell in the repository folder and run:

   ```powershell
   cd apps/mobile
   eas whoami
   ```

   It must print `msalman5230`. If it prints anything else, stop.
2. Run:

   ```powershell
   eas credentials --platform android
   ```

3. Answer the questions with the arrow keys and Enter:
   1. For the build profile, choose **production**. EAS then prints the application identifier. It must be `com.msalman5230.adwam`, not `com.msalman5230.adwam.preview`.
   2. Choose **Keystore: Manage everything needed to build your project**.
   3. Choose **Set up a new keystore**.
   4. When EAS asks **Generate a new Android Keystore?**, answer yes. EAS prints the new keystore's details.
4. Open <https://expo.dev/accounts/msalman5230/projects/adwam/credentials/android/com.msalman5230.adwam>. The page shows the upload keystore EAS just made. Don't upload anything here. EAS already has the key, and production builds use it from there.

**A backup is optional.** You can download the key again whenever you're signed in to Expo. Play App Signing holds the separate key that signs what users install, so if the upload key is ever lost, Google can reset it. A backup only saves you that wait. To keep one:

1. Run `eas credentials --platform android` again and choose **production**. Then choose **credentials.json: Upload/Download credentials between EAS servers and your local json**, and **Download credentials from EAS to credentials.json**. If EAS says you don't have any Android build credentials, step 3 above didn't finish. Do it again.
2. That writes two things inside `apps/mobile`: `credentials.json`, which holds the keystore's passwords, and `credentials/android/keystore.jks`, the key itself. Move `credentials.json` and the whole `credentials` folder together to a safe place you control, such as a password manager or an encrypted USB drive. Git ignores them, but this folder syncs to MegaSync and agents work in it.
3. Empty MEGA's Rubbish Bin, including its **SyncDebris** folder. MEGA keeps copies there of files that leave a synced folder.

## Part 7. Firebase: push delivery for the production app

Production has its own Firebase project, `adwam-production`. Preview keeps its own. Both steps below use `adwam-production`: the push key must come from the same Firebase project as `google-services.json`, or pushes won't arrive.

### 7.1 Add the production app

1. Open <https://console.firebase.google.com> and click `adwam-production`. If it isn't there, click **Create a project**, name it `adwam-production`, turn Google Analytics off (Adwam doesn't use it) and create it.
2. Click the gear next to **Project Overview**, then **Project settings**.
3. On the **General** tab, scroll to **Your apps**, click **Add app**, then the Android icon.
4. **Android package name:** `com.msalman5230.adwam`. Check it carefully, because it can't be changed later. **App nickname:** `Adwam`. Leave the SHA-1 box empty.
5. Click **Register app**.
6. Click **Download google-services.json**. Skip the remaining screens, which are for programmers, and go back to the console.
7. Upload the file as Expo variable `GOOGLE_SERVICES_JSON`, as a file, with visibility **Secret** ([how](#d-expo-variable)).
8. Delete the file from your Downloads folder.

### 7.2 The push key

Expo needs Firebase's service account key here, not `google-services.json`. Firebase gives you two different JSON files:

| File | Where Firebase gives it | Where it goes |
|---|---|---|
| `google-services.json` | **Project settings** → **General** → **Your apps** | Expo variable `GOOGLE_SERVICES_JSON`, in 7.1 |
| The service account key, named like `adwam-production-firebase-adminsdk-….json` | **Project settings** → **Service accounts** | Expo's **FCM V1 service account key**, in this step |

1. Open <https://console.firebase.google.com> and click `adwam-production`. Check the name at the top, so you don't use Preview's project.
2. Click the gear next to **Project Overview**, then **Project settings**. Open the **Service accounts** tab, click **Generate new private key**, then **Generate key**. A file with `firebase-adminsdk` in its name downloads.
3. In Expo, open the `com.msalman5230.adwam` credentials ([how](#e-expo-android-credential)). Under **FCM V1 service account key**, click **Add a service account key**.
4. Upload the `firebase-adminsdk` file and click **Save**. If Expo offers the key you saved for Preview, don't choose it. It belongs to Preview's Firebase project.
5. Delete the file from your Downloads folder. It lets anyone send pushes as Adwam.

If Expo says `"private_key": Required`, you uploaded `google-services.json`. Upload the `firebase-adminsdk` file instead.

## Part 8. Google Play: the app and its upload permission

### 8.1 Create the app in Play Console

Skip this if Adwam is already in your list of apps.

1. Open <https://play.google.com/console> and click **Create app**.
2. **App name:** `Adwam`. **Default language:** English (United States). **App or game:** App. **Free or paid:** Free.
3. Tick the declarations and click **Create app**.

The store listing, Data safety and content rating come later, in task M7.1, from the [store listing review](android/store-review.html).

### 8.2 Create a service account in Google Cloud

A service account is a login for a program. `eas submit` uses this one to upload builds to Play's internal testing track.

1. Open <https://console.cloud.google.com>. In the project picker at the top, choose `adwam-production`. Every Firebase project is also a Google Cloud project.
2. Open <https://console.cloud.google.com/apis/library/androidpublisher.googleapis.com>, check the project name at the top, and click **Enable**. If the button says **Manage**, the API is already on.
3. Open <https://console.cloud.google.com/iam-admin/serviceaccounts> and click **Create service account**.
4. **Service account name:** `adwam-play-submit`. Click **Create and continue**.
5. Skip the optional role and access screens: click **Continue**, then **Done**. The account needs no Google Cloud role, because its Play access comes from 8.3.
6. In the list, copy the new account's email. It ends in `.iam.gserviceaccount.com`. You'll paste it in 8.3.
7. Click that email, open the **Keys** tab, click **Add key** → **Create new key**, choose **JSON** and click **Create**. A JSON file downloads, and Google won't offer it again.

If Google says an organization policy blocks key creation, stop and tell an agent.

### 8.3 Let the service account release to testing tracks

1. In Play Console's left menu, click **Users and permissions**, then **Invite new users**.
2. **Email address:** paste the service account's email from 8.2.
3. Open the **App permissions** tab, click **Add app**, tick **Adwam** and click **Apply**.
4. Tick only these two permissions, then click **Apply**:
   - **Release apps to testing tracks**
   - **View app information (read-only)**
5. Leave everything on the **Account permissions** tab unticked, and don't make it an account admin.
6. Click **Invite user** and confirm.

The service account doesn't need to accept the invitation, but Google can take up to a day to activate it. This permission can't release to the public. Only you can, by promoting a build in Play Console.

### 8.4 Give the key to Expo

1. In Expo, open the `com.msalman5230.adwam` credentials ([how](#e-expo-android-credential)). Under **Google service account key for Expo Submit**, click **Add a Google service account key**.
2. Upload the JSON file from 8.2 and click **Save**.
3. Delete the file from your Downloads folder.

## Part 9. Switch production on and deploy the server

### 9.1 Switch production on

Paste the production project ID from 2.2 as GitHub `production-monitor` variable `SUPABASE_PROJECT_ID` ([how](#b-github-variable)).

From now on, the plans run against production, the daily **Weather health** check includes production, and the admin page build includes the production page. If **Weather health** opens an issue before you finish 9.4, close it.

### 9.2 Deploy the production server

1. Open <https://github.com/MSalman5230/adwam/actions/workflows/ship-update.yml>.
2. Click **Run workflow** on the right. Leave **Use workflow from** on **Branch: master**.
3. Tick **Deploy only the production server, with no app update**.
4. Click the green **Run workflow** button.
5. Open the new run. Refresh the page if it hasn't appeared yet.
6. Wait for **Update plan** to show a green tick. Its summary lists the migrations it will run.
7. Click **Review deployments**, tick **production** and click **Approve and deploy**.
8. Wait for the **Production** job to show a green tick.

If a job fails, open it and give the red error lines to an agent. The logs never show secret values.

### 9.3 Run the scheduler setup

This starts the production server's scheduled jobs and creates their key in Supabase's Vault.

1. Open <https://github.com/MSalman5230/adwam/blob/master/supabase/setup-jobs.sql> and click **Copy raw file**, the icon of two overlapping squares above the file.
2. In Supabase, open the **production** project, click **SQL Editor** in the left menu, and start a new query.
3. Paste the file.
4. In the line `project_url text := 'https://REPLACE-WITH-PROJECT-REF.supabase.co';`, replace `REPLACE-WITH-PROJECT-REF` with the production project ID. Keep the quotes and `.supabase.co`.
5. Check that the last line says `debug_tools_enabled = false`. Debug tools stay off in production.
6. Click **Run**. Supabase reports success with no rows returned.

### 9.4 Save the job key

1. In the SQL Editor, replace everything with this line and click **Run**:

   ```sql
   select decrypted_secret from vault.decrypted_secrets where name = 'adwam_job_key';
   ```

2. Copy the long value in the result.
3. Paste it as Supabase production Edge Function secret `ADWAM_JOB_KEY` ([how](#c-supabase-edge-function-secret)).

### 9.5 Make yourself the admin

The admin page signs in with an emailed link. Only users listed in `public.admins` can approve date corrections.

1. In the production project, click **Authentication** → **Users** → **Add user** → **Create new user**.
2. **Email:** your email address. It must belong to a member of your Supabase organization, because Supabase's built-in email only sends to team members. **Password:** any long random password. You won't need it. Tick **Auto Confirm User** and click **Create user**.
3. Click the new user and copy its **User UID**.
4. In the SQL Editor, run this, with the UID in place of `PASTE-THE-USER-UID-HERE`. Keep the quotes.

   ```sql
   insert into public.admins (id) values ('PASTE-THE-USER-UID-HERE');
   ```

### 9.6 Publish the production admin page

1. Open <https://github.com/MSalman5230/adwam/actions/workflows/admin-pages.yml>, click **Run workflow**, leave the branch on `master`, and click the green **Run workflow** button. Wait for the run to finish.
2. Open <https://msalman5230.github.io/adwam/>. It shows the Date corrections page now, not the page saying production isn't set up.
3. Request a sign-in link and open the email in the same browser. You're signed in.

### 9.7 Check the weather job

1. Wait until the next quarter-hour has passed.
2. Open <https://github.com/MSalman5230/adwam/actions/workflows/daily-health.yml>, click **Run workflow**, leave the branch on `master`, and click the green **Run workflow** button.
3. Both jobs, staging and `production-monitor`, finish with a green tick.

### 9.8 Tell an agent

Tell an agent that production setup is done. It checks the plans against production and records task M6.12 in the plan. When you're ready for the first Play release, follow [Android app release](app-release.md).

## If something goes wrong

| What you see | Why | Fix |
|---|---|---|
| A run stops with "Production isn't set up yet" | `production-monitor` has no `SUPABASE_PROJECT_ID` | [9.1](#91-switch-production-on) |
| "The scoped token cannot read production Auth" or "cannot update production Auth" | The deploy token lacks Auth Config on Read-write | Create a new deploy token ([2.3](#23-create-the-deploy-token)) and replace the secret |
| "EAS did not confirm the msalman5230 account" | An `EXPO_TOKEN` belongs to another account, or was pasted with a space | Create a new robot token ([3.1](#31-the-build-robot) or [3.2](#32-the-viewer-robot)) and replace the secret |
| A production run deploys without asking you | `production` has no required reviewer | [1.1](#11-production) |
| GitHub won't let you approve your own run | **Prevent self-review** is ticked | Untick it, as in [1.1](#11-production) |
| Production crashes appear in `adwam-staging` | Expo Production or the production Supabase project has staging's DSN | Paste the `adwam-production` DSN over it ([4.5](#45-the-dsn)) |
| Expo says `"private_key": Required` when you add the FCM key | You uploaded `google-services.json` | Upload the `firebase-adminsdk` file ([7.2](#72-the-push-key)) |
| Production phones get no server pushes | The FCM key in Expo and `GOOGLE_SERVICES_JSON` come from different Firebase projects | Redo [7.2](#72-the-push-key) with a key from `adwam-production` |
| You lost a value before pasting it everywhere | Most sites show secrets only once | Create a new one and paste it over the old value in each place |

## Checklist

- [ ] 1.1 `production`: you as reviewer, self-review allowed, administrator bypass off, `master` only
- [ ] 1.2 `production-monitor`: `master` only
- [ ] 2.1 Project created, `SUPABASE_DB_PASSWORD` in `production`
- [ ] 2.2 `SUPABASE_PROJECT_ID` in `production`
- [ ] 2.3 Deploy token in `production`, expiry in your calendar
- [ ] 2.4 Read-only token in `production-monitor`, expiry in your calendar
- [ ] 3.1 `EXPO_TOKEN` in `production`
- [ ] 3.2 `EXPO_TOKEN` in `production-monitor`
- [ ] 3.3 `EXPO_ACCESS_TOKEN` in Supabase
- [ ] 4.1 `adwam-production` created in Sentry
- [ ] 4.2 Its privacy settings match `adwam-staging`
- [ ] 4.3 `SENTRY_AUTH_TOKEN` in GitHub `production` and in Expo
- [ ] 4.4 `SENTRY_ORG`, and `SENTRY_PROJECT` set to `adwam-production`, in GitHub `production` and in Expo
- [ ] 4.5 The `adwam-production` DSN as `EXPO_PUBLIC_SENTRY_DSN` in Expo and `SENTRY_DSN` in Supabase
- [ ] 5 PostHog privacy options set, `EXPO_PUBLIC_POSTHOG_KEY` in Expo
- [ ] 6 Upload key created, `com.msalman5230.adwam` listed in Expo credentials, and any backup kept outside the repository
- [ ] 7.1 Production app added to Firebase project `adwam-production`, `GOOGLE_SERVICES_JSON` in Expo
- [ ] 7.2 The `firebase-adminsdk` key from `adwam-production` as the FCM V1 key in Expo credentials
- [ ] 8.1–8.4 Play app created, service account invited, its key in Expo credentials
- [ ] 9.1 `SUPABASE_PROJECT_ID` in `production-monitor`
- [ ] 9.2 Production server deployed
- [ ] 9.3–9.4 Scheduler set up, `ADWAM_JOB_KEY` in Supabase
- [ ] 9.5–9.6 The production admin page signs you in
- [ ] 9.7 **Weather health** is green for production
- [ ] 9.8 An agent knows production is set up
