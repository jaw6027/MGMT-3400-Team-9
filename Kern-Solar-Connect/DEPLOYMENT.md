# Separate Kern Solar Connect website

This project belongs in its own GitHub repository, proposed name
`jaw6027/kern-solar-connect`. Do not push it to `jaw6027/MGMT-3400-Team-9`,
which contains Helio Home. No GitHub repository has been created for this project yet.

The workflow `.github/workflows/pages.yml` tests the project and publishes only
`public/`. Staff demo files, source tools, tests and handoff documents are excluded
from the hosted website. A public source repository still makes all committed
files visible on GitHub; staff sign-in is a classroom simulation with fictional data.

To publish once GitHub repository creation and Pages administration are available:

1. Create the separate repository, with no generated README or other initial files.
2. Add its HTTPS URL as this project's origin and push the `main` branch.
3. In the new repository's Settings > Pages, select **GitHub Actions** as the source.
4. Run **Publish customer website** from Actions (or push a new commit).
5. Wait for the deployment to succeed and use the URL reported by that deployment.

Do not claim the website is live until the deployed URL has been checked.
This static classroom demo does not send forms, book appointments or store prospects
on a server. It needs no build or dependency installation for publication.

Local customer server, from this directory:

```sh
python3 -m http.server 4173 --bind 0.0.0.0 --directory public
```

Validation:

```sh
node --test tests/crm.test.cjs tests/campaigns.test.cjs tests/languages.test.cjs
```
