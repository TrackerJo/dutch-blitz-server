const server = require('express')();
const http = require('http').createServer(server);
const io = require('socket.io')(http, {
    cors: {
        origin: "https://trackerjo.github.io",
        // origin: "http://localhost:8080",
        methods: ["GET", "POST"],
        credentials: true
    }
});
let players = [];

let rooms = [];

io.on('connection', function (socket) {
    console.log('A user connected: ' + socket.id);

    players.push(socket.id);

    io.emit('connectUser', socket.id);

    socket.on('dealCards', function (roomCode) {
        io.in(roomCode).emit('dealCards');
    });

    socket.on('cardPlayed', function (cardObj, userId, zoneObj,roomCode) {
        io.in(roomCode).emit('cardPlayed', cardObj, userId,zoneObj);
    });
    socket.on('createGame', function (userId ,joinCode, userName) {
        io.in(userId).socketsJoin(joinCode);
        rooms.push({ joinCode: joinCode, users: [
            { userId: userId, userName: userName, blitzDeck: 13 }
        ] });
        console.log('Game created with join code: ' + joinCode);
        console.log(rooms);

    });

    socket.on('updateBlitzDeck', function (userId, blitzDeck, joinCode) {
        let room = rooms.find(room => room.joinCode === joinCode);
        if (room) {
            let user = room.users.find(user => user.userId === userId);
            if (user) {
                user.blitzDeck = blitzDeck;
                console.log('User ' + userId + ' updated blitz deck to: ' + blitzDeck);
                io.to(joinCode).emit('updatePlayers', room.users);
            }
        }
    }
    );

    socket.on('disconnect', function () {
        console.log('A user disconnected: ' + socket.id);
        players = players.filter(player => player !== socket.id);
        // Remove the user from all rooms
        rooms.forEach(room => {
            room.users = room.users.filter(user => user.userId !== socket.id);
            if (room.users.length === 0) {
                rooms = rooms.filter(r => r !== room);
            }
        });
        
    });

    socket.on('joinGame', function (userId, joinCode, userName) {

        let room = rooms.find(room => room.joinCode === joinCode);
        if (room) {
            if(room.users.length >= 2){
                io.to(userId).emit('roomFull');
                return;
            }
            io.in(userId).socketsJoin(joinCode);
            room.users.push({ userId: userId, userName: userName, blitzDeck: 13 });
            console.log('User ' + userId + ' joined game with join code: ' + joinCode);
            console.log(rooms);
            io.to(joinCode).emit('updatePlayers', room.users);
            io.to(userId).emit('joinedRoom');
        } else {
            console.log('Room not found');
            io.to(userId).emit('roomNotFound');
        }
    }
    );
});

http.listen(3000, function () {
    console.log('Server started!');
});