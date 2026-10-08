---
name: android-build
description: Build the VocabFlow offline Android debug APK (seed encrypt → vite build → cap sync → Gradle assembleDebug), with the toolchain pins and per-OS commands. Run only when the user explicitly asks for an APK or an Android build.
disable-model-invocation: true
---

# Building the offline APK

Background and troubleshooting: `docs/ANDROID.md` (sections 4–7). Only build when asked. A Gradle build is slow and downloads dependencies if the cache is incomplete.

## Preconditions (check, don't assume)

- `frontend/node_modules` installed (`npm install` in `frontend/`).
- `frontend/.env` contains `VITE_SEED_SECRET` (check the key exists, never print the value).
- JDK 17. Linux machine: `/usr/lib/jvm/java-17-openjdk` (default `java` there is 11). Windows machine (`D:\project\VocabFlow`): the default JDK is 21, which is untested with this project. Look for a JDK 17 and ask the user if none is found.
- Android SDK platform 35: `ANDROID_HOME`, or `frontend/android/local.properties` with `sdk.dir` (not in the repo).
- Gradle wrapper is pinned to `gradle-8.10.2-all` in `frontend/android/gradle/wrapper/gradle-wrapper.properties`. Don't change it (on the Linux machine 8.10.2 is the only fully cached distribution). AGP is 8.2.1; compile/target SDK 35, min SDK 22.

## Steps

```bash
cd frontend
npx tsc --noEmit                 # passed with 0 errors on 2026-10-04; fix regressions before building
npm run seed:encrypt             # only if frontend/seed-src/ changed (public/seed-enc/ is committed)
npx vite build                   # the documented path; `npm run build` (= tsc && vite build) also works when tsc is clean
npx cap sync android
cd android
JAVA_HOME=/usr/lib/jvm/java-17-openjdk ./gradlew assembleDebug          # Linux
# Windows cmd:  set "JAVA_HOME=<JDK 17 path>" && gradlew.bat assembleDebug
```

Output: `frontend/android/app/build/outputs/apk/debug/app-debug.apk` (debug-signed; fine for sideloading).

## After building

- Report the APK path and size. State plainly that it was **not** run on a device unless the user did so. There is no automated device testing.
- `android/app/src/main/assets/public/` is generated and git-ignored. Don't commit it.
- If you changed anything under `frontend/src/offline/db.ts`, remind the user that upgraded installs go through `migrateSchema()`, and test an *upgrade* install as well as a fresh one.
