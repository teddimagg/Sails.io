const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;
const _ = require('lodash');
const uuidV4 = require('uuid/v4');

app.use(express.static(__dirname + '/public'));
http.listen(port, () => console.log('listening on port ' + port));

io.on('connection', onConnection);

const debugMode = true;
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

var goldplane = [];
for(var i = 0; i < map.x; i++){
    goldplane[i] = [];
    for(var j = 0; j < map.y; j++){
        goldplane[i][j] = 0;
    }
}

//Multiplayer settings
function onConnection(socket){
    socket.emit('mapinit', plane);

    console.log('A player connected');
    socket.on('add user', function(player) {
        player.id = uuidV4();
        socket.player = player;
        players.push(socket.player);
        // console.log(players);
        socket.emit('playerInfo', player);
    });

    socket.on('sailing', function(player) {
        playerid = player.id;
        players[_.findIndex(players, {'id': player.id})] = player;
        if(!debugMode){
            for(var i in players){
                if(Math.ceil(player.x) == Math.ceil(players[i].x) && Math.ceil(player.y) == Math.ceil(players[i].y) && player.id != players[i].id){
                    var removed = _.remove(players, function(n){
                        return n.id == socket.player.id || n.id == players[i].id;
                    });
                    console.log('collision ' + socket.player.name + " removed");
                }
            }
        }
        socket.emit('shipfleet', players);
    });

    socket.on('disconnect', function () {
        console.log('player disconnected');
        var removed = _.remove(players, function(n){
            if(socket){
                if(socket.player){
                    return n.id == socket.player.id;
                }
            }
        });
        console.log(players);
    });
}
