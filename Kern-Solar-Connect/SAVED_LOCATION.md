# Saved source location

Kern Solar Connect is backed up in the `Kern-Solar-Connect/` directory of
`jaw6027/MGMT-3400-Team-9`. Helio Home remains in the repository root.
The two applications have separate source files and local servers.

This directory is a source backup, not a published website. The nested
`.github/workflows/pages.yml` is a deployment template for a future separate
repository; GitHub does not execute workflows from this nested location.
See DEPLOYMENT.md for that separate-site publication plan.

Run the customer app from this directory:

```sh
python3 -m http.server 4173 --bind 0.0.0.0 --directory public
```

Run the staff demo separately with `--directory staff-demo` on port 4174.
The staff login is simulated and the records are fictional.

The original HANDOFF.md records the state at transfer time. It predates the
local initial commit and this GitHub backup.
