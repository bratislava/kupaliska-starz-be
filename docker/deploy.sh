#!/usr/bin/env sh

set -ex

/wait-for "${1:-localhost:5432}" -t 30
npm run migrate
npm run seed:prod
