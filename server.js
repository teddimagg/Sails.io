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
// app.use(function(req, res, next){
//     // console.log(req.cookies);
//         var cookie = req.cookies.cookieName;
//         if(cookie === undefined){
//             var randomNumber=Math.random().toString();
//             randomNumber=randomNumber.substring(2,randomNumber.length);
//             res.cookie('cookieName',randomNumber, { maxAge: 900000, httpOnly: true });
//             console.log('cookie created successfully');
//         } else {
//             console.log('cookie exists', cookie);
//         }
//         next();
// });
app.use(express.static(__dirname + '/public'));
http.listen(port, () => console.log('listening on port ' + port));

app.post('/addusername', function(req, res){
    // console.log("cookiename", req.cookies.cachedUsername);
    console.log(req.body.name + " " + req.cookies.cachedUsername);
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
    // console.log('/addusername called');
    // console.log(req.body);
    // res.cookie('cachedUsername', req.body.name);
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
    y: 450
};

var _tickrate = 60; //frames per second

//TRIGGERS
var _islandmargin = 0.30; //25% sailthroughness
var _shipmargin = 0.50; //TODO: implement!!
var _goldmargin = 0; //easy to pickup

var _crashturndeg = 0;
var _crashturncurdeg = 3;

//PAIN ENDORSMENTS
var _crashislanpain = 0.5;
var _crashplayerpain = 1;

//SAILING
var _initspeed = (3) / _tickrate; //2.1 tiles per second
var _initrotatespeed = 1.5 //deg per frame
var _crashpenalty = 0.7; //down 30%
var _sprintspeed = 1.5 * _initspeed;
var _sprintrotatespeed = 1;

//SPAWNING
var _goldpersecond = 25;
var _maxgoldpercentage = 0.3; //Of map..

var _firespeed = 0.2 * _tickrate + 10; //seconds * tickrate // + 10 for explotionanim
var _firecooldown = 3 * _tickrate //seconds
var _firerange = 2 //tiles
var _firedamage = 40 //damage if direct hit
var _firedamagereduction = 0.6 //60% per tile away
var _firedamageblastradius = 1

//
var _healthregen = 1 / _tickrate; //2 per sec
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

// goldinterval = setInterval(function(){
//     if(golds.length < _maxgoldpercentage * map.x * map.y){
//         golds.push({
//             value: Math.ceil(Math.random() * 50),
//             x: Math.floor(Math.random() * map.x),
//             y: Math.floor(Math.random() * map.y)
//         });
//     }
// }, 1000/_goldpersecond);

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
        if(!socket.player){
            // socket.disconnect();
        }

        player = socket.player;
        if(socket.player && player.health > 0){
            player.dir = dir;
            if(player.sprint && player.score > _sprintcost){
                player.speed.sail = _sprintspeed;
                player.speed.rotate = _sprintrotatespeed;
                player.score -= _sprintcost;
            } else {
                player.speed.sail = _initspeed;
                player.speed.rotate = _initrotatespeed;
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
                player.sprint = false;
            }

            //COLLISION CHECK

            for(var i in players){
                if(Math.ceil(player.x) == Math.ceil(players[i].x) && Math.ceil(player.y) == Math.ceil(players[i].y) && player.id != players[i].id){
                    player.health -= _crashplayerpain;
                    player = crash(player);
                    player.lasttouch = players[i].name;
                }
            }



            if(player.attack.left.progr){
                player.attack.left.progr--
                if(player.attack.left.progr <= 0){
                    for(i in players){
                        if(player.attack.left.x - _firedamageblastradius < players[i].x && player.attack.left.x + _firedamageblastradius > players[i].x){
                            if(player.attack.left.y - _firedamageblastradius < players[i].y && player.attack.left.y + _firedamageblastradius > players[i].y){
                                console.log(player.name + ' hitti ' + players[i].name);
                                players[i].health -= _firedamage;
                                players[i].lasttouch = player.name;
                                if(players[i].health <= 0){
                                    player.score += _killscore_
                                    ;
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
                        if(player.attack.right.x - _firedamageblastradius < players[i].x && player.attack.right.x + _firedamageblastradius > players[i].x){
                            if(player.attack.right.y - _firedamageblastradius < players[i].y && player.attack.right.y + _firedamageblastradius > players[i].y){
                                console.log(player.name + ' hitti ' + players[i].name);
                                players[i].health -= _firedamage;
                                players[i].lasttouch = player.name;
                                if(players[i].health <= 0){
                                    player.score++;
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
                console.log(player.name + " was killed by " + player.lasttouch);
                player.alive = false;
                _.remove(players, function(p){
                    return socket.player.id == p.id;
                });
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
                console.log(player.name + " fires to the " + direction);
            }
        } else if(direction == 'right'){
            if(!player.attack.right.cooldown){
                var attack = findNewPoint(player.x, player.y, player.curdir, _firerange);
                attack.cooldown = _firecooldown;
                attack.origx = player.x;
                attack.origy = player.y;
                attack.progr = _firespeed;
                player.attack.right = attack;
                console.log(player.name + " fires to the " + direction);
            }
        }
    });

    socket.on('sprint', function (b) {
        (b) ? player.sprint = true : player.sprint = false;
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

function findNewPoint(x, y, angle, distance) {
    var result = {};

    result.x = Math.cos(angle * Math.PI / 180) * distance + x;
    result.y = Math.sin(angle * Math.PI / 180) * distance + y;

    return result;
}
