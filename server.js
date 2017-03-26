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

interval = setInterval(function(){
    io.emit('shipfleet', players);
}, 1000/60)

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

    socket.on('sailing', function(dir) {
        if(!socket.player){
            socket.disconnect();
        }
        playerid = socket.player.id;

        var player = socket.player;
        player.dir = dir;

        player.curdir += getRotation(player);
        player = moveDirection(player);

        if(player.x < map.buffer || player.y < map.buffer || player.x > map.x - map.buffer || player.y > map.y - map.buffer){
            //TODO: hefur siglt out of bounds
        }

        //check ground
        if(plane[Math.floor(player.x)][Math.floor(player.y)] < 5){
            player.speed.sail = 0.020;
            // console.log('sailing on land');
        } else {
            player.speed.sail = 0;
        }

        //COLLISION CHECK
        // if(!debugMode){
        //     for(var i in players){
        //         if(Math.ceil(player.x) == Math.ceil(players[i].x) && Math.ceil(player.y) == Math.ceil(players[i].y) && player.id != players[i].id){
        //             var removed = _.remove(players, function(n){
        //                 return n.id == socket.player.id || n.id == players[i].id;
        //             });
        //             console.log('collision ' + socket.player.name + " removed");
        //         }
        //     }
        // }

        players[_.findIndex(players, {'id': player.id})] = socket.player = player;
        socket.emit('playerInfo', player);
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


function getRotation(player){
    var rotation = 0;
    if(player.curdir < player.dir - player.speed.rotate){
        if(player.curdir < 90 && player.dir > 90 && (player.dir - player.curdir) > 180){
            rotation = -player.speed.rotate;
        } else {
            rotation = player.speed.rotate;
        }
    } else if (player.curdir > player.dir + player.speed.rotate){
        if(player.curdir > 90 && player.dir < 90 && (player.curdir - player.dir) > 180){
            rotation = player.speed.rotate;
        } else {
            rotation = -player.speed.rotate;
        }
    }
    return rotation;
}

function moveDirection(player){
    if(player.curdir > 270){player.curdir = -90}
    if(player.curdir < -90){player.curdir = 270}

    var move = {x: 0, y: 0};
    if(player.curdir < 0){
        var ratio = player.curdir / -90 ;
        move.x = -ratio * player.speed.sail;
        move.y = -(1 - ratio) * player.speed.sail;
    } else if(player.curdir < 90) {
        var ratio = player.curdir / 90 ;
        move.x = ratio * player.speed.sail;
        move.y = -(1 - ratio) * player.speed.sail;
    } else if(player.curdir < 180) {
        var ratio = (player.curdir - 90) / 90 ;
        move.x = (1 - ratio) * player.speed.sail;
        move.y = ratio * player.speed.sail;
    } else {
        var ratio = (player.curdir - 180) / 90 ;
        move.x = -ratio * player.speed.sail;
        move.y = (1 - ratio) * player.speed.sail;
    }

    player.x += move.x;
    player.y += move.y;
    return player;
}