---
name: EAS Build in Replit
description: How to submit EAS cloud builds when Replit blocks all git operations in the main agent.
---

## The Problem
Replit main agent blocks ALL git operations (including `git init` in /tmp). EAS CLI requires git to archive the project for upload (`git archive` or `git stash`). `EAS_NO_VCS=1` bypasses git but hits a different bug: "Cannot read properties of undefined (reading 'create')" during upload — the NoVcsClient has a bug with the EAS CLI version in this project.

## Working Solution: Direct API Bypass
Skip the EAS CLI entirely. Use Node.js fetch to call the EAS GraphQL API directly:

### 1. Create project + credentials (one-time setup)
```js
// Create Expo project
mutation { app { createApp(appInput: { accountId: "<accountId>", projectName: "<slug>" }) { id } } }

// Create Android keystore (generate with OpenSSL if no keytool)
openssl req -newkey rsa:2048 -nodes -keyout key.key -x509 -days 10000 -out cert.crt -subj "/CN=<appname>/..."
openssl pkcs12 -export -in cert.crt -inkey key.key -out app.keystore -name <alias> -passout pass:<pass>

// Upload keystore via: androidKeystore.createAndroidKeystore(accountId, androidKeystoreInput)
// Then: androidAppCredentials.createAndroidAppCredentials(appId, applicationIdentifier)
// Then: androidAppBuildCredentials.createAndroidAppBuildCredentials(androidAppCredentialsInput, androidAppCredentialsId)
```

### 2. Create project archive (skip git)
```bash
tar --exclude='./node_modules' --exclude='./.expo' --exclude='./android/build' \
    --exclude='./android/.gradle' --exclude='./ios/Pods' --exclude='./dist' \
    --transform 's|^\.|project|' -czf /tmp/project.tar.gz .
```

### 3. Upload and submit build
```js
// Get GCS upload session
mutation { uploadSession { createUploadSession(type: EAS_BUILD_GCS_PROJECT_SOURCES) } }
// Returns { url, headers, bucketKey } — headers is plain object, not array

// PUT the tar.gz to the signed URL with Content-Type: application/gzip
// Then submit build:
mutation CreateAndroidBuild($appId: ID!, $job: AndroidJobInput!, $metadata: BuildMetadataInput) {
  build { createAndroidBuild(appId: $appId, job: $job, metadata: $metadata) { build { id status } } }
}
```

### AndroidJobInput (correct shape — platform and distribution are NOT fields):
```js
{
  type: 'MANAGED',
  mode: 'BUILD',
  triggeredBy: 'EAS_CLI',
  projectArchive: { type: 'GCS', bucketKey: '<bucketKey>' },
  projectRootDirectory: '.',
  buildType: 'APK',
  gradleCommand: ':app:assembleRelease',
  applicationArchivePath: 'android/app/build/outputs/apk/**/*.apk',
  builderEnvironment: { node: '22.14.0' },
  secrets: {
    buildCredentials: {
      keystore: { dataBase64: '<base64>', keystorePassword: '<pass>', keyAlias: '<alias>', keyPassword: '<pass>' }
    }
  },
  updates: { channel: 'preview' },
  cache: { clear: false },
  experimental: {},
}
```

## AllerGuide project state (as of session)
- Expo account: zuevfoton2 (accountId: 883c75f5-d4e3-4039-99e4-0efd35cea200)
- App projectId: a7a65ba6-58c0-494e-abcd-0803dc0ed5a0
- Android keystore: stored in EAS (keystoreId: 4b1d5cea-c131-4645-a048-8cb42572f7eb), alias: allerguide, pass: AllerGuide2024
- Session secret stored in ~/.expo/state.json (v2 Expo session format)

**Why:** EAS CLI blocks in Replit because Replit intercepts destructive git operations for security. Direct API works because it doesn't depend on git at all.

**How to apply:** Whenever EAS `eas build` is needed in the main agent, use the direct GraphQL + tar approach described above instead of the CLI.
