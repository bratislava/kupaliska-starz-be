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

Copy the `.env.example` file as `.env`.

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

The app can be deployed by standard means through [bratiska-cli](https://github.com/bratislava/bratiska-cli).

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
