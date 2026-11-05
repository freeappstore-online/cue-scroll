# Cue

A free teleprompter for speeches, videos and practice. Save scripts on your device,
set a comfortable scrolling speed and text size, and use mirror mode with a reflector.

- Accessible script editing with validation and committed device-local saves.
- Pause with Space, touch, or manual scrolling; automatic pause when hidden.
- Adjustable reading size/speed and optional screen wake lock.
- Local scripts and the cached app work offline after the first successful load.
- Profile, appearance preferences, install handling and app frame use the FAS SDK.

Sign-in is optional. Scripts remain device-local; account sign-in does not sync them.
Keep another copy of scripts you want on other devices.

## Develop

Use Node 22+ and pnpm 10.30.3. Run `pnpm install`, `pnpm dev`, `pnpm typecheck`,
`pnpm test`, and `pnpm build`. Dev/build generates browser and install icons from
`web/public/icon.svg`. Preview the release with `pnpm preview`.

Scaffolded locally from `@freeappstore/cli@0.4.73`, standalone plus the optional
persistence capability. Based on the front-site Teleprompter idea.
