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


// ------------------------------------------------------------------------------------- //
    //  SERVER SETTINGS
// ------------------------------------------------------------------------------------- //
const debugMode = false;
var players = [];

//MAP SIZE
var map = {
    x: 450,
    y: 450
};

var _tickrate = 60; //frames per second

//TRIGGERS
var _islandmargin = 0.30; //25% sailthroughness
var _shipmargin = 0.50; //TODO: implement!!

var _crashturndeg = 10;
var _crashturncurdeg = 2;

//PAIN ENDORSMENTS
var _crashislanpain = 0.5;
var _crashplayerpain = 1;

//SAILING
var _initspeed = (2.1) / _tickrate; //2.1 tiles per second
var _crashpenalty = 0.7; //down 30%

//MAP SETUP
var plane = [];
for(var i = 0; i < map.x; i++){
    plane[i] = [];
    for(var j = 0; j < map.y; j++){
        plane[i][j] = Math.floor(Math.random() * 100);
        // plane[i][j] = (Math.random() < .05) ? 1 : 0;
    }
}

//COLLECTABLES SETUP
var goldplane = [];
for(var i = 0; i < map.x; i++){
    goldplane[i] = [];
    for(var j = 0; j < map.y; j++){
        goldplane[i][j] = 0;
    }
}


// ------------------------------------------------------------------------------------- //
    //  SOCKET SETUP
// ------------------------------------------------------------------------------------- //

interval = setInterval(function(){
    io.emit('shipfleet', players);
}, 1000/_tickrate)

//Multiplayer settings
function onConnection(socket){
    socket.emit('mapinit', plane);
    console.log('Connection made');

    var player;

    socket.on('add user', function(name) {
        console.log(name + 'has started sailing!');
        player = socket.player = {
            // x: Math.ceil(Math.random() * 330) + 60,
            // y: Math.ceil(Math.random() * 330) + 60,
            // x: 120,
            // y: 120,
            x: Math.ceil(Math.random() * 3) + 120,
            y: Math.ceil(Math.random() * 3) + 120,
            curdir: 0,
            dir: 0,
            speed: {sail: 0.035, rotate: 1}, //tiles per tick, degs per tick
            alive: true,
            health: 100,
            name: name
        };
        player.id = uuidV4();
        players.push(socket.player);
        socket.emit('playerInfo', player);
    });

    socket.on('sailing', function(dir) {
        if(!socket.player){
            socket.disconnect();
        }

        player = socket.player;
        player.dir = dir;

        if(player.health <= 0){
           player.alive = false;
           socket.disconnect();
           return;
        }

        player.curdir += getRotation(player);
        player = moveDirection(player);

        if(player.x < map.buffer || player.y < map.buffer || player.x > map.x - map.buffer || player.y > map.y - map.buffer){
            //TODO: hefur siglt out of bounds
        }

        //check ground
        if((player.x % 1) > _islandmargin && (player.x % 1) < (1 - _islandmargin) && plane[Math.floor(player.x)][Math.floor(player.y)] < 5){
            player.speed.sail = _initspeed * _crashpenalty;
            player = crash(player);
            player.health -= _crashislanpain;
        } else {
            player.speed.sail = _initspeed;
        }

        //COLLISION CHECK
        if(!debugMode){
            for(var i in players){
                if(Math.ceil(player.x) == Math.ceil(players[i].x) && Math.ceil(player.y) == Math.ceil(players[i].y) && player.id != players[i].id){
                    player.health -= _crashplayerpain;
                    player = crash(player);
                }
            }
        }

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
    });
}

// ------------------------------------------------------------------------------------- //
    //  GAME FUNCTIONALITY HELPERS
// ------------------------------------------------------------------------------------- //

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

function crash(player){
    (Math.random() <= 0.5) ? player.curdir += _crashturncurdeg : player.curdir -= _crashturndeg;
    (Math.random() <= 0.5) ? player.dir += _crashturndeg : player.dir -= _crashturndeg;
    return player;
}