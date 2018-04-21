FROM node:0.10.38

Add . /code

WORKDIR /code

RUN npm install

EXPOSE 3000

CMD ["npm", "start"]
