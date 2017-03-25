const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;
const _ = require('lodash');

app.use(express.static(__dirname + '/public'));
http.listen(port, () => console.log('listening on port ' + port));

io.on('connection', onConnection);

var players = [];

var map = {
    x: 450,
    y: 450
};

//Game setting initiation
var plane = [];
for(var i = 0; i < map.x; i++){
    plane[i] = [];
    for(var j = 0; j < map.y; j++){
        plane[i][j] = Math.floor(Math.random() * 100);
        // plane[i][j] = (Math.random() < .05) ? 1 : 0;
    }
}

//Multiplayer settings
function onConnection(socket){
    socket.emit('mapinit', plane);
    var playerid = null;
    console.log('A player connected');
    socket.on('add user', function(player) {
        playerid = player.id;
        players.push(player);
    });

    socket.on('sailing', function(player) {
        playerid = player.id;
        players[_.findIndex(players, {'id': player.id})] = player;
        socket.emit('shipfleet', players);
    });

    socket.on('disconnect', function () {
        console.log('player disconnected');
        players = _.remove(players, function(n){
            n.id = playerid;
        });
    });
}