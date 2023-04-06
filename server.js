const express = require('express');
const app = express();
const http = require('http');
const path = require("path");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

var StorageJSON = require("./build/contracts/Storage.json");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "src")));
app.use(express.static(path.join(__dirname, "build")));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/src/index.html');
});

app.get("/Storage.json", function (request, response) {
  response.send(StorageJSON);
});

app.get('/host.html', (req, res) => {
  res.sendFile(__dirname + '/public/src/host.html');
});

app.get('/client.html', (req, res) => {
  res.sendFile(__dirname + '/public/src/client.html');
});

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

server.listen(8000, () => {
  console.log('listening on *:8000');
});