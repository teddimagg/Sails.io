const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;
const _ = require('lodash');
const uuidV4 = require('uuid/v4');
const cookieParser = require('cookie-parser');
var bodyParser = require('body-parser')

app.use(cookieParser());
app.use(bodyParser.json())
app.use(express.static(__dirname + '/public'));
http.listen(port, () => console.log('listening on port ' + port));

app.post('/addusername', function(req, res){
    var existingCookie = req.cookies.cachedUsername;
    if(existingCookie === undefined){
        res.cookie('cachedUsername', req.body.name, { });
        res.status(201).send('cookie created successfully')
        console.log('cookie created successfully');
    } else {
        if(req.body.name === existingCookie){
            console.log('same name');
            res.cookie('cachedUsername', existingCookie, { });
            res.status(200).send('Same name');
        } else {
            res.cookie('cachedUsername', req.body.name, { });
            res.status(200).send('setting new cookie name');
            console.log("setting new cookie name", req.body.name);
        }

    }
});
io.on('connection', onConnection);


// ------------------------------------------------------------------------------------- //
    //  SERVER SETTINGS
// ------------------------------------------------------------------------------------- //
const debugMode = false;
var players = [];
var golds = [];

//MAP SIZE
var map = {
    x: 450,
    y: 450,
    buffer: 30
};

var _tickrate = 60; //frames per second

//TRIGGERS
var _islandmargin = 0.23;                           //% sailthroughness
var _shipmargin = 0.50;                             //TODO: implement!!
var _goldmargin = 0;                                //easy to pickup

var _crashturndeg = 0;
var _crashturncurdeg = 3;

//PAIN ENDORSMENTS
var _crashislanpain = 1;
var _crashplayerpain = 1;

//SAILING
var _initspeed = (3) / _tickrate;                   //2.1 tiles per second
var _initrotatespeed = 1.5                          //deg per frame
var _outofboundpenalty = 15 / _tickrate;            //hp down per sec
var _sprintspeed = 1.5 * _initspeed;
var _sprintrotatespeed = 1;

//Combat
var _firespeed = 0.2 * _tickrate + 10;              //seconds * tickrate // + 10 for explotionanim
var _firecooldown = 3 * _tickrate                   //seconds
var _firerange = 2                                  //tiles
var _firedamage = 70                                //damage if direct hit
var _firedamagereduction = 0.6                      //60% per tile away
var _firedamageblastradius = 1

//
var _healthregen = 1 / _tickrate;                   //2 per sec
var _alivescore = 0.5 / _tickrate;

var _killscore = 80;
var _sprintcost = 8 / _tickrate;

//MAP SETUP
var plane = [];
for(var i = 0; i < map.x; i++){
    plane[i] = [];
    for(var j = 0; j < map.y; j++){
        plane[i][j] = Math.floor(Math.random() * 100);
    }
}

// ------------------------------------------------------------------------------------- //
    //  SOCKET SETUP
// ------------------------------------------------------------------------------------- //

interval = setInterval(function(){
    io.emit('shipfleet', players);
    // io.emit('golds', golds);
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
            x: Math.ceil(Math.random() * 3) + 40,
            y: Math.ceil(Math.random() * 3) + 40,
            curdir: 0,
            dir: 0,
            speed: {sail: _initspeed, rotate: _initrotatespeed}, //tiles per tick, degs per tick
            alive: true,
            health: 100,
            name: name,
            attack: {left: {x: 0, y: 0, cooldown: 0}, right: {x: 0, y: 0, cooldown: 0}},
            score: 0,
            lasttouch: 'yourself',
            sprint: false
        };
        player.id = uuidV4();
        players.push(socket.player);
        socket.emit('playerInfo', player);
    });

    socket.on('sailing', function(dir) {
        player = socket.player;
        if(socket.player && player.health > 0){
            player.dir = dir;

            player.curdir += getRotation(player);
            player = moveDirection(player);

            if(player.x < map.buffer || player.y < map.buffer || player.x > map.x - map.buffer || player.y > map.y - map.buffer){
                //TODO: hefur siglt out of bounds
                player.health -= _outofboundpenalty;
            }

            //check ground
            if(plane[Math.floor(player.x)][Math.floor(player.y)] < 5){
                player = crashIsland(player);
            } else {
                player.speed.sail = _initspeed;
                player.sprint = false;
            }

            //COLLISION CHECK

            for(var i in players){
                if(Math.ceil(player.x) == Math.ceil(players[i].x) && Math.ceil(player.y) == Math.ceil(players[i].y) && player.id != players[i].id){
                    if(players[i].alive){
                        player.health -= _crashplayerpain;
                        player = crashShip(player);
                        player.lasttouch = players[i].name;
                    } else {
                        console.log('touching shipwreck!');
                        player.score += players[i].score * 0.5;
                        _.remove(players, function(n){
                            return n.id == players[i].id;
                        });
                    }
                }
            }



            if(player.attack.left.progr){
                player.attack.left.progr--
                if(player.attack.left.progr <= 0){
                    for(i in players){
                        if(players[i].alive){
                            if(player.attack.left.x - _firedamageblastradius < players[i].x && player.attack.left.x + _firedamageblastradius > players[i].x){
                                if(player.attack.left.y - _firedamageblastradius < players[i].y && player.attack.left.y + _firedamageblastradius > players[i].y){
                                    var xprox = Math.abs(player.attack.left.x - players[i].x);
                                    var yprox = Math.abs(player.attack.left.y - players[i].y);
                                    var median = (xprox + yprox) / 2;
                                    var damage = Math.abs((_firedamage * (1 - median * 2)).toFixed(0));
                                    players[i].health -= damage;
                                    players[i].lasttouch = player.name;

                                    if(players[i].health <= 0){
                                        player.score += _killscore;
                                    }
                                    socket.emit('hit', {x: players[i].x, y: players[i].y, damage: damage});
                                }
                            }
                        }
                    }
                }
            };
            if(player.attack.left.cooldown){ player.attack.left.cooldown--}
            if(player.attack.right.progr){
                player.attack.right.progr--
                if(player.attack.right.progr <= 0){
                    for(i in players){
                        if(players[i].alive){
                            if(player.attack.right.x - _firedamageblastradius < players[i].x && player.attack.right.x + _firedamageblastradius > players[i].x){
                                if(player.attack.right.y - _firedamageblastradius < players[i].y && player.attack.right.y + _firedamageblastradius > players[i].y){
                                    players[i].health -= _firedamage;
                                    players[i].lasttouch = player.name;
                                    if(players[i].health <= 0){
                                        player.score += _killscore;
                                    }
                                    socket.emit('hit', {x: players[i].x, y: players[i].y, damage: _firedamage});
                                }
                            }
                        }
                    }
                }
            };

            if(player.attack.right.cooldown){player.attack.right.cooldown--};
            player.score += _alivescore;

            if(player.health < 100){player.health += _healthregen};

            players[_.findIndex(players, {'id': player.id})] = socket.player = player;
            socket.emit('playerInfo', player);
        } else {
            if(player){
                player.health = 0;
                console.log(player.name + " was killed by " + player.lasttouch);
                player.alive = false;
                socket.emit('playerInfo', player);
            }
            socket.player.alive = false;
        }


    });

    socket.on('fire', function (direction) {
        if(direction == 'left'){
            if(!player.attack.left.cooldown){
                var attack = findNewPoint(player.x, player.y, player.curdir - 180, _firerange);
                attack.cooldown = _firecooldown;
                attack.origx = player.x;
                attack.origy = player.y;
                attack.progr = _firespeed;
                player.attack.left = attack;
            }
        } else if(direction == 'right'){
            if(!player.attack.right.cooldown){
                var attack = findNewPoint(player.x, player.y, player.curdir, _firerange);
                attack.cooldown = _firecooldown;
                attack.origx = player.x;
                attack.origy = player.y;
                attack.progr = _firespeed;
                player.attack.right = attack;
            }
        }
    });

    socket.on('sprint', function (b) {
        (b) ? player.sprint = true : player.sprint = false;
    });

    socket.on('disconnect', function () {
        if(player){
            player.alive = false;
            player.health = 0;
        }
        // var removed = _.remove(players, function(n){
        //     if(socket){
        //         if(socket.player){
        //             return n.id == socket.player.id;
        //         }
        //     }
        // });
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

function crashShip(player){
    (Math.random() <= 0.5) ? player.curdir += _crashturncurdeg : player.curdir -= _crashturndeg;
    (Math.random() <= 0.5) ? player.dir += _crashturndeg : player.dir -= _crashturndeg;
    return player;
}

function crashIsland(player){
    var p = { x: player.x % 1, y: player.y % 1 };
    var deltahalf = { x: Math.abs(p.x - 0.5), y: Math.abs(p.y - 0.5) };
    var median = (deltahalf.x + deltahalf.y) / 2;
    //(player.x % 1) > _islandmargin && (player.x % 1) < (1 - _islandmargin)

    if(median < 0.1){
        player.speed.sail = 0;
    } else {
        player.speed.sail = _initspeed * 2 * (median - 0.1);
    }

    if(0.5 - median > _islandmargin){
        player.health -= _crashislanpain;
    }
    return player;
}

function findNewPoint(x, y, angle, distance) {
    var result = {};

    result.x = Math.cos(angle * Math.PI / 180) * distance + x;
    result.y = Math.sin(angle * Math.PI / 180) * distance + y;

    return result;
}
