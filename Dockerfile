FROM node:18.14.0-alpine AS base
ENV NODE_ENV=production

FROM base AS app-base
RUN apk update \
 && apk add tini \
 && rm -rf /var/cache/apk/* \
 && mkdir -p /home/node/app \
 && chown -R node:node /home/node/app
USER node
WORKDIR /home/node/app
COPY --chown=node:node --chmod=0755 start.sh .
ENTRYPOINT [ "/sbin/tini", "--" ]

FROM base AS build-base
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci --production

FROM build-base AS build
COPY --chown=node:node . ./
RUN npm ci --production=false \
 && npm run build

FROM app-base AS dev
ENV NODE_ENV=development
COPY --chown=node:node --from=build /build/node_modules ./node_modules
CMD ["./start.sh"]

FROM app-base AS prod
COPY --chown=node:node .sequelizerc /home/node/app/.sequelizerc
COPY --chown=node:node resources /home/node/app/resources
COPY --chown=node:node files /home/node/app/files
COPY --chown=node:node locales /home/node/app/locales
COPY --chown=node:node --from=build-base /build/package.json ./
COPY --chown=node:node --from=build-base /build/node_modules ./node_modules
COPY --chown=node:node --from=build /build/dist/config /home/node/app/config
COPY --chown=node:node --from=build /build/dist /home/node/app/dist
EXPOSE 3000
ARG GIT_COMMIT="undefined"
ENV GIT_COMMIT=$GIT_COMMIT
LABEL org.opencontainers.image.revision="${GIT_COMMIT}" \
      org.opencontainers.image.source="https://github.com/bratislava/kupaliska-starz-be" \
      org.opencontainers.image.licenses="EUPL-1.2"
VOLUME ["/home/node/app/files", "/home/node/app/logs"]
CMD [ "./start.sh" ]
