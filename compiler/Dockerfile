FROM node:24-alpine@sha256:50c8e8ca1d27439048670df5883f32d57cf81cff6233222c893fd0d9884cbd81
WORKDIR /opt/compiler
ARG PROFILE=.
COPY ${PROFILE}/package.json ${PROFILE}/package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund && npm cache clean --force
COPY compile.mjs scaffold.mjs ./
USER 1000:1000
ENV NODE_ENV=production
ENTRYPOINT ["node","/opt/compiler/compile.mjs"]
