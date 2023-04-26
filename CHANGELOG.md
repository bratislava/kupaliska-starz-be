## [1.3.1](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/compare/v1.3.0...v1.3.1) (2021-07-01)

### Bug Fixes

-   tickets summary is now filtered by date of the ticket usage ([57df172](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/57df172fba378c860c273f5ba879afda719bedbf))

# [1.3.0](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/compare/v1.2.2...v1.3.0) (2021-06-30)

### Bug Fixes

-   add number of tickets to orders export, change price formatting in orders export ([6866e85](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/6866e856d7fcbdd3e49962befaee2f9127eb5c64))
-   one-day date range filters ([f673e05](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/f673e05e832f55f53f0fc117ee9b9f1abe1969d2))
-   remove last column from orders export ([b9fedbf](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/b9fedbf622ca976b346862f6937c98b090cd2765))

### Features

-   add access to swimming pool employee to getting current visits ([71d7e17](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/71d7e17f0217dac1859dd5473d60d78870b97f7e))
-   add day filter for tickets sales ([1247a57](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/1247a57d8d8c7f7b31356239c1ded61068ddacbb))

## [1.2.2](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/compare/v1.2.1...v1.2.2) (2021-06-21)

### Bug Fixes

-   make cron workers work in production ([3d00102](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/3d0010229aea8774c030c52d93f10fd640161216))

## [1.2.1](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/compare/v1.2.0...v1.2.1) (2021-06-21)

### Bug Fixes

-   order by nulls last in customers table ([8db3239](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/8db3239d65a6fd2f41d118131a4a901401bf6c39))

# [1.2.0](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/compare/v1.1.1...v1.2.0) (2021-06-18)

### Bug Fixes

-   fix number of the orders for customers, string aggregate without accent + query performance ([1c061ff](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/1c061ff6f730a0f14fbbc44cc4a00f946d55dc1c))
-   get summary only for filters ticket types ([b14a58b](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/b14a58b4a8fb9a0e1d8a4b63a80655de8ca6557e))
-   move script for generating fake data to src ([58e9f7b](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/58e9f7be0b15c03a62251808978993e75bad9f34))
-   remove logging property from tickets ([c4d892c](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/c4d892c6f38a376cebfc66e7d26754063fd9795c))
-   remove ordering problem + init swimming pools with right ordering ([a95e812](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/a95e812463eb04d0add3021c59b92566441fd227))
-   swimming pool ordering when ordering is not filled ([919b0a3](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/919b0a331372d31e6feb8f5bcf35fb8a7e1b6c1f))
-   update lodash and remove base64 img - remove vulnerabilities ([8d18704](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/8d18704b27e0a419e8b3d47acb05c8eb1d96e546))
-   update sentry packages ([a74e3f4](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/a74e3f4d2c74217deb781b0113b295f4b5e60edc))

### Features

-   add endpoint for tickets sales - rename provision na comission ([3144f59](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/3144f591ca9e8b877f3cfef06773d486d644457c))
-   add ordering functionality for swimming pools ([1d1fce0](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/1d1fce005ed699d124ba11a4f9c14d98ab7fc161))
-   add total averages and total number of visits to visits endpoints ([b7bb43a](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/b7bb43a4c03bfe107bde0698f77f4e66ecbfe938))
-   admins can export discount codes ([c8e338e](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/c8e338e4c3fb95def31220dd13209fd2fe259185))
-   change permissions for admin discount codes to only for super admin ([a22a141](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/a22a141efda8bc1476d060ccfaa1f6029d2d0cb8))
-   commission coefficient from dotenv ([777433f](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/777433f53c814497aaf59949bc8760bf4c92f186))
-   create endpoint for getting ticket sales ([b94bc56](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/b94bc565937834d581c793974bd66e24e0c46d47))
-   endpoint for getting number of current visits ([256fd08](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/256fd08e04b0127e70a8157ee88c0f58fdf16a02))
-   order users by deletedAt ([db69cb4](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/db69cb4e932a77f74c985a4e3f954253be30e40e))
-   return customer email with discount codes ([46a6b73](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/46a6b731f4f6f9438483fa45e28844401ec56615))
-   show all zip codes when their count is less than threshold value ([1f27c58](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/1f27c58615f176361285698e18f5f9888150d8e1))
-   swimming pool operator can get all ticket types and anonymized customers data ([a1e8233](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/a1e823353ad8eb95cee78df1b65b9deaf7924fbe))
-   **common:** filtering age but show also records with unspecified age ([45d5516](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/45d5516a5e7c9aa7d627d36560b7d5288fd87d62))
-   **common:** swimming pool operator can get all his swimming pools and patch also opening hours ([d8b12b3](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/d8b12b3afb38af382d408175d07e11f89cde4b0e))
-   **endpoint:** add query param for getting also soft deleted ticket types ([72f50b5](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/72f50b534e4b1775a0da1993df09064fa821313e))

### Performance Improvements

-   customers table ([30afe96](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/30afe9666aa0981fe0a85c6894dd58d546349fdc))
-   get ticket types sales ([c3653be](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/c3653be4fb65b49bd3895b964d4e011e6296776d))
-   **common:** create materialized view for visits ([87b46f7](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/87b46f7ec98cfe8319be9b47e64a15e1867142c1))

### Reverts

-   feat: discount codes amount as decimal with precision 2 ([77e71d2](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/77e71d2dd32bab8be0405f4e23fef6bfa53def34))

## [1.1.1](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/compare/v1.1.0...v1.1.1) (2021-06-14)

### Bug Fixes

-   order`s price cannot be zero, discount codes only in integers ([630e296](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/630e2966787ea803c689aff345f66d83bfcba72f))

# [1.1.0](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/compare/v1.0.0...v1.1.0) (2021-06-08)

### Features

-   **common:** swimming pool operator can get all his swimming pools and patch also opening hours ([48a67a8](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/48a67a80f3e377056a7c9ee6b6b0850c44772937))

### Performance Improvements

-   **container:** remove migrations from container startup and use init system ([d501cdf](https://gitlab.amcef.sk/bratislava-projekty/kupaliska/kupaliska-starz/commit/d501cdf8428d195a425c17a0c08d7efc39aea645))
