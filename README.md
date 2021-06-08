# Kupaliska STARZ

This app is built on Node.js framework Express.

To start app run you should follow this steps:

1. npm install
2. create .env file from .env.example
3. set right .env variables (eg. database credentials)
4. npm run migrate:dev
5. npm run seed:dev (this will hang aat 07-fakeOrders, that's ok and you can safely exit the process)
6. npm run debug/npm run start

You can also use docker and docker-compose.


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
