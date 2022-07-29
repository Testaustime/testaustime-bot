FROM node:16-alpine AS builder

WORKDIR /app

RUN apk update && \
    apk upgrade && \
    apk add git

COPY yarn.lock package.json ./

RUN yarn --production=true --frozen-lockfile --link-duplicates

COPY .git .git

RUN git rev-parse --short HEAD | tee revision

RUN rm -rf .git

FROM node:16-alpine

WORKDIR /app

ENV NODE_ENV="production"

RUN apk update && \
    apk upgrade && \
    apk add --no-cache dumb-init ttf-opensans

RUN chown -R node:node /app

COPY --chown=node:node --from=builder /app .
COPY --chown=node:node src/ src/

USER node:node

ENTRYPOINT [ "/usr/bin/dumb-init", "--" ]
CMD [ "yarn", "start" ]
