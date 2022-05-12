FROM node:latest

WORKDIR /source
COPY . /source/

RUN npm i
RUN npm run build

ENTRYPOINT ["npm","run","start"]
