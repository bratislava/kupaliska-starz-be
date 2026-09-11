# Kupaliska STARZ

This app is built on Node.js framework Express.

## Documentation

There is .pdf documentation in docs folder

## Product specification

[Product specification](https://magistratba.sharepoint.com/:w:/s/InnovationTeam/EbkNEpF0x5dNgH-nfmNf03UB8oJLmVhrDIkOe0aZ9JrEPA?e=ZXjH7z)

## Development setup

### Without Docker

#### Install Database

Before you start you need to have Postgres database running locally so install it.

#### Create database:

In pgAdmin create new database with name **kupaliska** and owner **postgres**.

```sql
CREATE DATABASE kupaliska;
CREATE USER postgres WITH PASSWORD 'password';
GRANT ALL ON DATABASE kupaliska TO postgres;
ALTER DATABASE kupaliska OWNER TO postgres;
```

#### Dependencies

Install dependencies:

```
npm install
```

#### Environment

Copy the `.env.development` file as `.env`.

Then fill these variables:

| Variable       | Description                                                                         |
| -------------- | ----------------------------------------------------------------------------------- |
| `HOST`         | <span style="color:red">FULL API URL</span> including protocol, host and port       |
| `PORT`         | API port (should be same as in previous variable)                                   |
| `CORS_ORIGINS` | Array of <span style="color:red">FULL URLS</span> from where client app can request |

##### Database

Then you need to fill or replace these database variables:

-   `POSTGRES_USER` - username
-   `POSTGRES_PASSWORD` - password
-   `POSTGRES_DB` - database name (it must exists)

##### GP Webpay

To make payment gateway work you need to fill the following variables.
To get them, please contact Martin Pinter or Patrik Kadlcik

-   `GP_WEBPAY_HTPP_API_URL`
-   `GP_WEBPAY_MERCHANT_NUMBER`
-   `GP_WEBPAY_CURRENCY`
-   `GP_WEBPAY_KEYS_PATH`
-   `GP_WEBPAY_PRIV_KEY_PASS`
-   `GP_WEBPAY_CLIENT_APP_URL`
-   `GP_WEBPAY_PROVIDER`

##### Recaptcha

We're using turnstile. In case that it is needed `TURNSTILE_SECRET_KEY` can be found in [Cloudflare] (https://www.cloudflare.com) page under section `Turnstile`. From there use the `kupaliska.bratislava.sk` site.

##### Mailgun

To make emails work, all of the following variables must be set but you also have to be set in authorized recipients [here](https://app.mailgun.com/app/sending/domains/sandboxa9861f03a870473b83e62ffee945e664.mailgun.org) and when you are making order, enter the exact email.

-   `MAILGUN_HOST` - Mailgun domain host
-   `MAILGUN_DOMAIN` - Domain from which emails are sent
-   `MAILGUN_EMAIL_FROM` - From which email emails are sent
-   `MAILGUN_TEMPLATE_RESET_PASSWORD` - Name of the template for password reset
-   `MAILGUN_TEMPLATE_ORDER` - Name of the template for order
-   `MAILGUN_TEMPLATE_SET_PASSWORD` - Name of the template for password set

#### Setup Database

Run migrations and seeders:

```
npm run migrate:dev
npm run seed:dev
```

#### Start the app

```
npm run start
```

or

```
npm run debug
```

## Deployment

The app runs on three clusters - `development`, `staging` and `production` - and is deployed by GitHub pipelines. The overall pipeline and release rules are described in [Deployment & releases](https://magistratba.sharepoint.com/:fl:/r/contentstorage/CSP_e7fd7f53-9abe-456a-b0e1-7cc0c63e3f1a/Document%20Library/LoopAppData/Deployment%20%26%20releases.loop?d=we29942dcbfe34648a857e7d3bfb196cf&csf=1&web=1&e=MLf6C9&nav=cz0lMkZjb250ZW50c3RvcmFnZSUyRkNTUF9lN2ZkN2Y1My05YWJlLTQ1NmEtYjBlMS03Y2MwYzYzZTNmMWEmZD1iJTIxVTNfOTU3NmFha1d3NFh6QXhqNF9Hc3RnWmNMRlhXQkR2Z2F4bHUxdEdsNGZsSnk2d2ZCeFRvWi00aXZqZ0o4ayZmPTAxWVJNMktXRzRJS002Rlk1N0pCREtRVjdIMk83M0RGV1AmYz0lMkYmYT1Mb29wQXBwJnA9JTQwZmx1aWR4JTJGbG9vcC1wYWdlLWNvbnRhaW5lciZ4PSU3QiUyMnclMjIlM0ElMjJUMFJUVUh4dFlXZHBjM1J5WVhSaVlTNXphR0Z5WlhCdmFXNTBMbU52Ylh4aUlWVXpYemsxTnpaaFlXdFhkelJZZWtGNGFqUmZSM04wWjFwalRFWllWMEpFZG1kaGVHeDFNWFJIYkRSbWJFcDVObmRtUW5oVWIxb3ROR2wyYW1kS09HdDhNREZaVWsweVMxZERRMUUyTTB4Qk5VODBOMFpHVEVVMFIwNVFTbGRLUlVoYVVRJTNEJTNEJTIyJTJDJTIyaSUyMiUzQSUyMjU1NzQyNmM4LTBmYjMtNDVhYi1iYTg1LWQ0MzZkYzMyODU1MCUyMiU3RA%3D%3D); the `.env.deploy.*` format, Passbolt naming and secret sync are described in [Environment variables & Secrets](https://magistratba.sharepoint.com/:fl:/r/contentstorage/CSP_e7fd7f53-9abe-456a-b0e1-7cc0c63e3f1a/Document%20Library/LoopAppData/Environment%20variables%20%26%20Secrets.loop?d=w77387c85f8b94b50a848ccc19d3c0972&csf=1&web=1&e=C9nE81&nav=cz0lMkZjb250ZW50c3RvcmFnZSUyRkNTUF9lN2ZkN2Y1My05YWJlLTQ1NmEtYjBlMS03Y2MwYzYzZTNmMWEmZD1iJTIxVTNfOTU3NmFha1d3NFh6QXhqNF9Hc3RnWmNMRlhXQkR2Z2F4bHUxdEdsNGZsSnk2d2ZCeFRvWi00aXZqZ0o4ayZmPTAxWVJNMktXRUZQUTRIUE9QWUtCRjJRU0dNWUdPVFlDTFMmYz0lMkYmYT1Mb29wQXBwJnA9JTQwZmx1aWR4JTJGbG9vcC1wYWdlLWNvbnRhaW5lciZ4PSU3QiUyMnclMjIlM0ElMjJUMFJUVUh4dFlXZHBjM1J5WVhSaVlTNXphR0Z5WlhCdmFXNTBMbU52Ylh4aUlWVXpYemsxTnpaaFlXdFhkelJZZWtGNGFqUmZSM04wWjFwalRFWllWMEpFZG1kaGVHeDFNWFJIYkRSbWJFcDVObmRtUW5oVWIxb3ROR2wyYW1kS09HdDhNREZaVWsweVMxZERRMUUyTTB4Qk5VODBOMFpHVEVVMFIwNVFTbGRLUlVoYVVRJTNEJTNEJTIyJTJDJTIyaSUyMiUzQSUyMmEzYTI0MjIxLTBkMmUtNGUyYi1iZWEyLTQ4OTBjZGUwYTdkYiUyMiU3RA%3D%3D). This section covers what is specific to this repo.

### How deploys work

Deploys are triggered by pushing a git tag whose name starts with a cluster prefix, handled by [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) via the shared `resolve-environment` action:

| Tag | Cluster |
|---|---|
| `dev*` (e.g. `dev1.0.0`) | `development` |
| `staging*` | `staging` |
| `prod*` | `production` |

Every push to `master` deploys to `staging` through [`.github/workflows/master.yml`](.github/workflows/master.yml). Pull requests only build the image without pushing it ([`.github/workflows/pr.yml`](.github/workflows/pr.yml)).

Build and deploy share [`.github/workflows/_build.yml`](.github/workflows/_build.yml): the image `harbor.bratislava.sk/standalone/kupaliska-starz-backend` is environment-agnostic, so a single per-commit build is reused across clusters and tagged `<cluster>-<short-sha>`. The deploy job then dispatches [infrastructure-deployment-configuration](https://github.com/bratislava/infrastructure-deployment-configuration), which applies the Terragrunt unit `clusters/<cluster>/applications/kupaliska_starz/backend` (namespace `starz`) and waits for the rollout. The shared actions come from [bratislava/github-actions](https://github.com/bratislava/github-actions).

### Environment variables and secrets

- **Non-secret env vars** live in `.env.deploy.<cluster>` at the root of this repo (e.g. `.env.deploy.staging`). On deploy the infrastructure repo reads the file from the exact commit being deployed and turns it into the `kupaliska-starz-backend-env` config map. `GP_WEBPAY_KEYS_PATH` is `resources/keys` on every cluster; the keys mounted there are the GP webpay test keys on `development`/`staging` and the live keys on `production`.
- **Secrets** live in [Passbolt](https://passbolt.bratislava.sk) in the `/kubernetes/kupaliska-starz-backend/` folder and are synced by External Secrets Operator:
  - env vars named `<cluster>/kupaliska-starz-backend/<ENV_VAR_NAME>` sync into the `kupaliska-starz-backend-secret` Kubernetes Secret: `JWT_SECRET`, `MAILGUN_API_KEY`, `TURNSTILE_SECRET_KEY`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `GP_WEBPAY_PRIV_KEY_PASS`, `APPLE_WALLET_CERTIFICATE_PASSWORD`;
  - files the app reads from disk are separate entries named after the file, mounted read-only under `resources/`: `<cluster>/kupaliska-starz-backend-apple-wallet/apple-wallet-cert.pem` → `resources/apple-wallet`, `<cluster>/kupaliska-starz-backend-google-wallet/credentials.json` → `resources/google-pay`, `<cluster>/kupaliska-starz-backend-gpwebpay-keys/{gpe.signing.pem,merchant-pvk.key}` → `resources/keys`.
- **Database credentials** (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`) are generated by the CNPG operator in the cluster and wired in from the operator-managed Secret; `POSTGRES_HOST` is set by the infrastructure unit. They are mirrored into Passbolt as `read-only/<cluster>/kupaliska-starz-backend/*` for lookup only.

If you don't have Passbolt access, ask the team.

## Apidoc

To create apidoc run:

`npm run apidoc:scan`

Apidoc will be available on **/apidoc**, only in development environment.

## Tests

To run tests create **.env.test** file.
It`s important to set at least this dotenv variables

`GP_WEBPAY_KEYS_PATH=resources/placeholder-test-keys`

and direct POSTGRES variables to your test DB.

Then you should be able to simply run:

`npm run test`

or

`npm run test:coverage`

## Translations

App is using i18next translation package. For running scanner use:

`npm run translate:scan`

It will NOT rewrite your current translations.
