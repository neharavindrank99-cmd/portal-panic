const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const rooms = {};

function makeRoomCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < 6; i++) {
    code += letters[Math.floor(Math.random() * letters.length)];
  }

  return code;
}

io.on("connection", (socket) => {

  console.log("Player connected:", socket.id);

  socket.on("createRoom", () => {

    let roomCode = makeRoomCode();

    while (rooms[roomCode]) {
      roomCode = makeRoomCode();
    }

    rooms[roomCode] = {
      players: []
    };

    socket.join(roomCode);

    rooms[roomCode].players.push(socket.id);

    socket.emit("roomCreated", roomCode);

    console.log("Room created:", roomCode);
  });

  socket.on("joinRoom", (roomCode) => {

    roomCode = roomCode.toUpperCase();

    if (!rooms[roomCode]) {
      socket.emit("roomError", "Room does not exist.");
      return;
    }

    if (rooms[roomCode].players.length >= 8) {
      socket.emit("roomError", "Room is full.");
      return;
    }

    socket.join(roomCode);

    rooms[roomCode].players.push(socket.id);

    socket.emit("roomJoined", roomCode);

    io.to(roomCode).emit(
      "playerCount",
      rooms[roomCode].players.length
    );

    console.log(
      "Player joined room:",
      roomCode
    );
  });

  socket.on("disconnect", () => {

    for (const roomCode in rooms) {

      const room = rooms[roomCode];

      room.players = room.players.filter(
        (playerId) => playerId !== socket.id
      );

      if (room.players.length === 0) {
        delete rooms[roomCode];
      } else {
        io.to(roomCode).emit(
          "playerCount",
          room.players.length
        );
      }
    }

    console.log("Player disconnected:", socket.id);
  });

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(
    `Portal Panic server running on port ${PORT}`
  );
});