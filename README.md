# Kupaliska STARZ

This app is built on Node.js framework Express.

## Install

Before you start you need to have Postgres database running locally - you can configure the credentials and database name via `.env` file. Check `.env.example` to see the example setup. Check the [Confluence Postgres cheatsheet](https://inovaciebratislava.atlassian.net/wiki/spaces/DEV/overview?homepageId=98745) or internet resources for help with setup of local database.

To start app run you should follow this steps:

1. npm install
2. create .env file from .env.example
3. set right .env variables (eg. database credentials)
4. npm run migrate:dev
5. npm run seed:dev (this will hang aat 07-fakeOrders, that's ok and you can safely exit the process)
6. npm run debug/npm run start

You can also use docker and docker-compose.

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
