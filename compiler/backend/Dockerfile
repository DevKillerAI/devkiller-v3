FROM node:24-alpine
WORKDIR /opt/backend
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
USER 1000:1000
ENTRYPOINT ["node","/opt/backend/runner.mjs"]
