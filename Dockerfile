FROM node:20-alpine

RUN mkdir /project

# Copy deps
WORKDIR /project

# Install dependencies to create a cache layer
COPY ./package.json /project
COPY ./package-lock.json /project

# Copy configs
COPY ./nx.json /project
COPY ./tsconfig.base.json /project

COPY ./jest.config.ts /project
COPY ./jest.preset.js /project
COPY ./nx.json /project

# Runs building processes of the server and the client
COPY ./apps/ /project/apps

# Build the server
RUN \
  npm pkg delete scripts.prepare \
  && npm ci \
  && npm run nx:build

ENV HOST=0.0.0.0

# Runs database migrations before every run
COPY ./docker-entrypoint.sh /project/docker-entrypoint.sh
ENTRYPOINT [ "./docker-entrypoint.sh" ]

CMD ["npm", "start"]
