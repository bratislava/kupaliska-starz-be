# Kupaliska STARZ

This app is built on Node.js framework Express.

## Documentation

There is .pdf documentation in docs folder

## Development setup

### Without Docker

#### Install Database

Before you start you need to have Postgres database running locally so install it.

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

- `POSTGRES_USER` - username
- `POSTGRES_PASSWORD` - password
- `POSTGRES_DB` - database name (it must exists)

##### GP Webpay

To make payment gateway work you need to fill the following variables.
To get them, please contact Martin Pinter or Patrik Kadlcik

- `GP_WEBPAY_HTPP_API_URL`
- `GP_WEBPAY_MERCHANT_NUMBER`
- `GP_WEBPAY_CURRENCY`      
- `GP_WEBPAY_KEYS_PATH`   
- `GP_WEBPAY_PRIV_KEY_PASS`  
- `GP_WEBPAY_CLIENT_APP_URL` 
- `GP_WEBPAY_PROVIDER`    

##### Recaptcha

To make recaptcha work properly, you need to set `RECAPTCHA_CLIENT_SECRET` variable from
[reCAPTCHA Enterprise](https://console.cloud.google.com/security/recaptcha). From there use the `kupaliska.bratislava.sk` key.
To get the credentials to login, please contact Martin Pinter or Patrik Kadlcik

##### Mailgun

To make emails work, all of the following variables must be set but you also have to be set in authorized recipients [here](https://app.mailgun.com/app/sending/domains/sandboxa9861f03a870473b83e62ffee945e664.mailgun.org) and when you are making order, enter the exact email.

- `MAILGUN_HOST` - Mailgun domain host
- `MAILGUN_DOMAIN` - Domain from which emails are sent
- `MAILGUN_EMAIL_FROM` - From which email emails are sent
- `MAILGUN_TEMPLATE_RESET_PASSWORD` - Name of the template for password reset
- `MAILGUN_TEMPLATE_ORDER` - Name of the template for order
- `MAILGUN_TEMPLATE_SET_PASSWORD` - Name of the template for password set

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

### Staging

These are accessible through VPN only.

kupaliska-backend: http://172.25.5.138:9004/

kupaliska-frontend: http://172.25.5.138:9005/

Presently the app is deployed from Azure git repo (TODO consolidate this) - https://dev.azure.com/bratislava-innovation/Inovacie

To add it as a second remote use:

```
git remote add azure git@ssh.dev.azure.com:v3/bratislava-innovation/Inovacie/name-of-repo
```

Commits in master are deployed to staging automatically

```
git push azure master
```

You can also manually deploy, master or other branch, Pipelines -> kupaliska-starz-be -> Run pipeline.

### Production

To promote to production, approve the production build step in a successful staging deploy in Azure Devops (Pipelines -> kupaliska-starz-be -> choose build -> Review).

## Apidoc

To create apidoc run:

`npm run apidoc:scan`

Apidoc will be available on **/apidoc**, only in development environment.

## Tests

To run tests create **.env.test** file.
It`s important to set at least this dotenv variables

```GP_WEBPAY_KEYS_PATH=resources/placeholder-test-keys```

and direct POSTGRES variables to your test DB.

Then you should be able to simply run:

`npm run test`

or

`npm run test:coverage`

## Translations

App is using i18next translation package. For running scanner use:

```npm run translate:scan```

It will NOT rewrite your current translations.
