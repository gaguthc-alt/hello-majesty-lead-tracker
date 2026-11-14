# Hello Majesty Android

A single Android shell for the existing Hello Majesty web application.

## Access-control invariant
- Authentication remains the existing Supabase Auth flow.
- The app loads the existing production web application; it does not create users, roles, permissions, or business data.
- All role/outlet visibility and database authorization remain enforced by the existing application and Supabase policies.
- Do not add client-side role overrides or a second permission model.

## Build
Open this directory in Android Studio, or run:
`gradle assembleDebug`

The debug APK is generated at:
`app/build/outputs/apk/debug/app-debug.apk`

## Notes
The current first milestone is the Android container around the existing app. Native FCM delivery and notification channels require registering Android package `id.hellomajesty.app` in Firebase and adding its Android configuration before enabling native push. This is intentionally not faked with browser-only notification code.
