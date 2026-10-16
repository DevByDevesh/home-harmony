### Fix TanStack version mismatch causing Nitro build export errors

Problem

Nitro production build was failing with `MISSING_EXPORT` errors because different `@tanstack/*` packages expected internal SSR exports that were not present in the installed `@tanstack/router-core` version.

Change

- Align `@tanstack/react-router`, `@tanstack/react-start`, and `@tanstack/router-plugin` to `1.170.18`.
- Add an `overrides` entry pinning `@tanstack/router-core` to `1.170.18` to ensure a single, compatible build of router-core is used.

Validation

- Run `rm -rf node_modules package-lock.json .nitro .output && npm install && npm run build` locally or in CI. The build should no longer fail with missing-export errors.

Notes

If CI still reports missing exports, run `npm ls @tanstack/router-core` to see if multiple versions are present; we may need to pin additional dependent packages or upgrade/downgrade packages that bring an incompatible router-core.
