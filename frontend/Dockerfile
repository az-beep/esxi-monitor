FROM node:18-alpine

WORKDIR /index

COPY . .

RUN npm install -g http-server

EXPOSE 3000

CMD ["http-server", ".", "-p", "3000", "--cors", "-c-1"]