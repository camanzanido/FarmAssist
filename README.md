# Welcome to FarmAssist
FarmAssist is an offline-first mobile decision support application that assists
farmers and agricultural extension workers in making climate-informed decisions
using the Rapid Climate Decision Analysis (RCDA) model.

The application enables users to continue working without an internet
connection while automatically synchronizing data with the cloud once
connectivity is restored.

## Features

- Offline decision creation
- Role-based authentication
- Automatic synchronization
- SQLite local database
- PowerSync synchronization
- Decision history
- Researcher dashboard
- User management
- Reports and analytics

## Technology Stack
React Native, SQLite, PowerSync, and Supabase

## Development and Releases
- Day-to-day work: `npm run android` once to install the **FarmAssist Dev** debug app (package `com.farmassist.app.debug`, installs beside the release APK), then `npm start` for live reload.
- Branches: build features on `feat/*` branches and merge to `main` once CI passes.
- Testers: tag `vX.Y.Z-rcN` to publish a prerelease APK on GitHub Releases.
- Everyone: tag `vX.Y.Z` for the final release; fixes to a released version get the next patch tag (`vX.Y.Z+1`).
- Backend changes must stay backward compatible: add tables and columns, but never rename or drop anything an installed APK still reads until every user has updated.
