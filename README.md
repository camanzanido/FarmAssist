# Welcome to FarmAssist
FarmAssist is an offline-first mobile decision support application that assists
farmers and agricultural extension workers in making climate-informed decisions
using the Rapid Climate Decision Analysis (RCDA) model.

The application enables users to continue working without an internet
connection while automatically synchronizing data with the cloud once
connectivity is restored.

## Features

Field users (farmers and extension workers)
- Three decision problems: crop choice, crop variety, and protect or not (from rain)
- Five-step input wizard with a draggable climate forecast donut
- RCDA result with recommended option, earnings vs a normal-year forecast, and a decision tree
- Works fully offline and signed out; decisions sync once signed in
- Saved values: averaged inputs from other farmers, published by researchers (signed in and online)
- History with type filter and sort; how-to-use guide and glossary; update notice for new APKs

Admins (researchers)
- Overview dashboard with charts, filterable by location
- All decisions on a map or as a list, with search, type filter and removal
- PDF and Excel-friendly CSV export, by period and location
- Field user accounts: create, reset password, disable and enable
- Publish predefined input values

Accounts
- Username or email sign-in; email is optional
- Password reset by emailed code, or a temporary password set by an admin
- Terms and privacy consent at sign-up
- A disabled account can't sign in or sync; the app still works offline without signing in

## Technology Stack
React Native (Expo, TypeScript), SQLite, PowerSync, and Supabase (Postgres, Auth, Edge Functions)

## Development and Releases
- Day-to-day work: `npm run android` once to install the **FarmAssist Dev** debug app (package `com.farmassist.app.debug`, installs beside the release APK), then `npm start` for live reload.
- Checks: `npx tsc --noEmit`, `npm run lint`, `npx jest`. CI runs all three on every push.
- Branches: build features on `feat/*` and fixes on `fix/*`, and merge to `main` once CI passes.
- Testers: tag `vX.Y.Z-rcN` to publish a prerelease APK on GitHub Releases.
- Everyone: tag `vX.Y.Z` for the final release; fixes to a released version get the next patch tag (`vX.Y.Z+1`).
- Backend changes must stay backward compatible: add tables and columns, but never rename or drop anything an installed APK still reads until every user has updated.
- Database changes live in `supabase/migrations`; run each new file in the Supabase SQL editor, in order.
- Researcher accounts are created in the app (Users → Add user) through the `create-user` Edge Function. To bootstrap the first researcher (or recover if none is active), register in the app, then run `update public.users set user_type = 'researcher', status = 'active' where username = '<username>';` in the Supabase SQL editor. Setting `status = 'active'` there also lifts the sign-in ban on a disabled or deleted account.
- Edge Functions live in `supabase/functions`: `sign-in`, `register`, `create-user`, `reset-password`, `change-username`. After `npx supabase login`, deploy a changed one with `npx supabase functions deploy <name> --project-ref <project-ref>`. `sign-in` and `register` run before anyone is signed in, so deploy those two with `--no-verify-jwt` added.
- The PowerSync sync streams are mirrored in `powersync/sync-config.yaml`; edit the live config in the PowerSync dashboard to match.
