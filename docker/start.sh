#!/usr/bin/env sh

set -e

# add pre-start scripts and migrations here

npm run migrate
npm run seed:prod

exec node dist/src
