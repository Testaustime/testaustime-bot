FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV="production"

RUN apk update && \
    apk upgrade && \
    apk add --no-cache dumb-init ttf-opensans
   
COPY yarn.lock package.json ./

RUN yarn --production=true --frozen-lockfile --link-duplicates

COPY src/ src/

USER node:node

ENTRYPOINT [ "/usr/bin/dumb-init", "--" ]
CMD [ "yarn", "start" ]
