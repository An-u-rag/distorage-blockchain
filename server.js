const express = require('express');
const app = express();
const http = require('http');
const path = require("path");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

var StorageJSON = require("./build/contracts/Storage.json");
var AuditJSON = require("./build/contracts/Audit.json");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "src")));
app.use(express.static(path.join(__dirname, "build")));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/src/index.html');
});

app.get("/Storage.json", function (request, response) {
  response.send(StorageJSON);
});

app.get("/Audit.json", function (request, response) {
  response.send(AuditJSON);
});

app.get('/host.html', (req, res) => {
  res.sendFile(__dirname + '/src/host.html');
});

app.get('/client.html', (req, res) => {
  res.sendFile(__dirname + '/src/client.html');
});

const users = []; 
io.on('connection', (socket) => {
  console.log('a user connected', socket.address);

  let user = {
    userID: socket.id,
    address: socket.address,
  }
  users.push(user);
  console.log(users)
  

  socket.on("initiate storage", ({ file, to, dataId, salt }) => {
    let hostId = null
    for (let i = 0; i < users.length; i++) {
      if (to.toLowerCase() === users[i].address.toLowerCase()){
        hostId = users[i].userID
        break
      }
    }
    let clientAddress = null
    for (let i = 0; i < users.length; i++) {
      if (users[i].userID == socket.id){
        clientAddress = users[i].address
        break
      }
    }
    socket.to(hostId).emit("initiate storage", {
      file: file,
      from: clientAddress,
      dataId: dataId,
      salt: salt
    });
  });

  socket.on("confirm storage", ({ from, to, confirm}) => {
    let clientId = null
    for (let i = 0; i < users.length; i++) {
      if (users[i].address.toLowerCase() == to.toLowerCase()){
        clientId = users[i].userID
        break
      }
    }
    socket.to(clientId).emit("confirm storage", {
      from: from,
      confirm: confirm
    })
  })

  socket.on("audit sequence start", ({to, from, abi, auditAddress}) => {
    let hostId = null
    for (let i = 0; i < users.length; i++) {
      if (users[i].address.toLowerCase() == to.toLowerCase()){
        hostId = users[i].userID
        break
      }
    }
    console.log(auditAddress)
    socket.to(hostId).emit("audit sequence start", {
      from: from,
      abi: abi,
      auditAddress: auditAddress
    })
  })

  socket.on("confirm audit sequence start", ({from, to, confirm}) => {
    let clientId = null
    for (let i = 0; i < users.length; i++) {
      if (users[i].address.toLowerCase() == to.toLowerCase()){
        clientId = users[i].userID
        break
      }
    }
    socket.to(clientId).emit("confirm audit sequence start", {
      from: from,
      confirm: confirm
    })
  })

  socket.on('disconnect', () => {
    for (let i = 0; i < users.length; i++) {
      if (socket.id == users[i].userID){
        console.log('user disconnected: ',users[i].address);
        users.splice(i, 1)
        break
      }
    }
  });
});

io.use((socket, next) => {
  const address = socket.handshake.auth.address;
  if (!address) {
    return next(new Error("invalid address"));
  }
  socket.address = address;
  next();
});

server.listen(8000, () => {
  console.log('listening on *:8000');
});