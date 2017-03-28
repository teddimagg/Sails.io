const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;
const _ = require('lodash');
const uuidV4 = require('uuid/v4');
const cookieParser = require('cookie-parser');

var bodyParser = require('body-parser');

var CONF = require('./config.json');

app.use(cookieParser());
app.use(bodyParser.json())
app.use(express.static(__dirname + '/public'));
http.listen(port, () => console.log('listening on port ' + port));

app.post('/addusername', function(req, res){
    var existingCookie = req.cookies.cachedUsername;
    if(existingCookie === undefined){
        res.cookie('cachedUsername', req.body.name, { });
        res.status(201).send('cookie created successfully');
    } else {
        if(req.body.name === existingCookie){
            console.log('same name');
            res.cookie('cachedUsername', existingCookie, { });
        } else {
            res.cookie('cachedUsername', req.body.name, { });
            res.status(200).send('setting new cookie name');
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
CONF.initspeed /= CONF.tickrate;
CONF.outofboundpenalty /= CONF.tickrate;
CONF.sprintspeed /= CONF.tickrate;
CONF.firespeed = CONF.firespeed * CONF.tickrate + 10;
CONF.firecooldown *= CONF.tickrate;
CONF.healthregen /= CONF.tickrate;
CONF.alivescore /= CONF.tickrate;
CONF.sprintcost /= CONF.tickrate;
CONF.wreckcleanuprate *= 1000;
CONF.assistwindow *= CONF.tickrate;
CONF.notificationtime *= CONF.tickrate;

//MAP SETUP

var plane = [];

for(var i = 0; i < CONF.map.x; i++){
    plane[i] = [];
    for(var j = 0; j < CONF.map.y; j++){
        plane[i][j] = Math.floor(Math.random() * 100);
    }
}

// ------------------------------------------------------------------------------------- //
    //  SOCKET SETUP
// ------------------------------------------------------------------------------------- //

interval = setInterval(function(){
    io.emit('shipfleet', players);
    // io.emit('golds', golds);
}, 1000/CONF.tickrate)

setInterval(function(){
    _.remove(players, function(n){
        return !n.alive;
    });
}, CONF.wreckcleanuprate)

//Multiplayer settings
function onConnection(socket){
    var playerinterval;

    socket.emit('gameinit', {plane: plane, conf: CONF});

    console.log('Connection made');
    var player;

    socket.on('add user', function(name) {
        console.log(name + 'has started sailing!');
        player = socket.player = {
            // x: Math.ceil(Math.random() * (CONF.map.x - 2*CONF.map.buffer)) + CONF.map.buffer,
            // y: Math.ceil(Math.random() * (CONF.map.y - 2*CONF.map.buffer)) + CONF.map.buffer,
            x: Math.ceil(Math.random() * 10) + 160,
            y: Math.ceil(Math.random() * 10) + 160,
            curdir: 0,
            dir: 0,
            speed: {sail: CONF.initspeed, rotate: CONF.initrotatespeed}, //tiles per tick, degs per tick
            alive: true,
            health: 100,
            name: name,
            attack: {left: {x: 0, y: 0, cooldown: 0}, right: {x: 0, y: 0, cooldown: 0}},
            score: 0,
            lasttouch: {p: 'yourself', c: -1},
            sprint: false,
            killstream: []
        };
        player.id = uuidV4();
        players.push(socket.player);
        socket.emit('playerInfo', player);
        playerinterval = setInterval(updatePlayer, 1000/CONF.tickrate)
    });


    socket.on('sailing', function(dir) {
        if(player){
            if(player.alive){
                player.dir = dir;
            }
        }
    });

    socket.on('fire', function (direction) {
        if(direction == 'left'){
            if(!player.attack.left.cooldown){
                var attack = findNewPoint(player.x, player.y, player.curdir - 180, CONF.firerange);
                attack.cooldown = CONF.firecooldown;
                attack.origx = player.x;
                attack.origy = player.y;
                attack.progr = CONF.firespeed;
                player.attack.left = attack;
            }
        } else if(direction == 'right'){
            if(!player.attack.right.cooldown){
                var attack = findNewPoint(player.x, player.y, player.curdir, CONF.firerange);
                attack.cooldown = CONF.firecooldown;
                attack.origx = player.x;
                attack.origy = player.y;
                attack.progr = CONF.firespeed;
                player.attack.right = attack;
            }
        }
    });

    socket.on('sprint', function (b) {
        if(player){
            if(player.sprint && !b){
                player.sprint = false;
            } else if(!player.sprint && b && player.score > CONF.sprintcost){
                player.sprint = true;
            }
        }
    });

    socket.on('disconnect', function () {
        if(player){
            player.alive = false;
            player.health = 0;
        }
        clearInterval(playerinterval);
    });

    function updatePlayer(){
        player = socket.player;
        if(player){
            if(socket.player && player.health > 0){
                if(player.sprint && player.score > CONF.sprintcost){
                    player.speed.sail = CONF.sprintspeed;
                    player.speed.rotate = CONF.sprintrotatespeed;
                    player.score -= CONF.sprintcost;
                } else {
                    player.speed.sail = CONF.initspeed;
                    player.speed.rotate = CONF.initrotatespeed;
                }

                if(player.killstream.length){
                    _.remove(player.killstream, function(n){
                        return n.cooldown <= 0;
                    });

                    for(i in player.killstream){
                        if(player.killstream[i].cooldown > 0){ player.killstream[i].cooldown--; }
                    }
                }

                //check ground
                if(plane[Math.floor(player.x)][Math.floor(player.y)] < 5){
                    player = crashIsland(player);
                    if(player.health <= 0 && player.lasttouch.c){
                        var pindex = _.findIndex(players, {'id': player.lasttouch.p});
                        if(players[pindex]){
                            players[pindex].score += CONF.assistscore;
                            players[pindex].killstream.push({ type: 'assist', player: player.name, cooldown: CONF.notificationtime });
                        }
                    }
                }

                player.curdir += getRotation(player);
                player = moveDirection(player);
                if(player.lasttouch.c){player.lasttouch.c--};

                if(player.x < CONF.map.buffer || player.y < CONF.map.buffer || player.x > CONF.map.x - CONF.map.buffer || player.y > CONF.map.y - CONF.map.buffer){
                    //TODO: hefur siglt out of bounds
                    player.health -= CONF.outofboundpenalty;
                }


                //COLLISION CHECK
                for(var i in players){
                    if(Math.ceil(player.x) == Math.ceil(players[i].x) && Math.ceil(player.y) == Math.ceil(players[i].y) && player.id != players[i].id){
                        if(players[i].alive){
                            player.health -= CONF.crashplayerpain;
                            if(player.health < 0){
                                players[i].score += CONF.crashscore
                                players[i].killstream.push({ type: 'kill', player: player.name, cooldown: CONF.notificationtime });
                            };
                            player = crashShip(player);
                            player.lasttouch = {p: players[i].id, n: players[i].name, c: CONF.assistwindow};
                            socket.emit('hit', {x: players[i].x, y: players[i].y, damage: CONF.crashplayerpain});
                        } else {
                            (player.health + CONF.healthonwreckage <= 100) ? player.health += CONF.healthonwreckage : player.health = 100;
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
                                if(player.attack.left.x - CONF.firedamageblastradius < players[i].x && player.attack.left.x + CONF.firedamageblastradius > players[i].x){
                                    if(player.attack.left.y - CONF.firedamageblastradius < players[i].y && player.attack.left.y + CONF.firedamageblastradius > players[i].y){
                                        var xprox = Math.abs(player.attack.left.x - players[i].x);
                                        var yprox = Math.abs(player.attack.left.y - players[i].y);
                                        var median = (xprox + yprox) / 2;
                                        var damage = Math.abs((CONF.firedamage * (1 - median * 2)).toFixed(0));
                                        players[i].health -= damage;
                                        players[i].lasttouch = {p: player.id, n: players[i].name, c: CONF.assistwindow};

                                        if(players[i].health <= 0){
                                            player.score += CONF.killscore;
                                            player.killstream.push({ type: 'kill', player: players[i].name, cooldown: CONF.notificationtime });
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
                                if(player.attack.right.x - CONF.firedamageblastradius < players[i].x && player.attack.right.x + CONF.firedamageblastradius > players[i].x){
                                    if(player.attack.right.y - CONF.firedamageblastradius < players[i].y && player.attack.right.y + CONF.firedamageblastradius > players[i].y){
                                        var xprox = Math.abs(player.attack.right.x - players[i].x);
                                        var yprox = Math.abs(player.attack.right.y - players[i].y);
                                        var median = (xprox + yprox) / 2;
                                        var damage = Math.abs((CONF.firedamage * (1 - median * 2)).toFixed(0));
                                        players[i].health -= damage;
                                        players[i].lasttouch = {p: player.id, n: players[i].name, c: CONF.assistwindow};
                                        if(players[i].health <= 0){
                                            player.score += CONF.killscore;
                                            player.killstream.push({ type: 'kill', player: players[i].name, cooldown: CONF.notificationtime });
                                        }
                                        socket.emit('hit', {x: players[i].x, y: players[i].y, damage: damage});
                                    }
                                }
                            }
                        }
                    }
                };

                if(player.attack.right.cooldown){player.attack.right.cooldown--};
                player.score += CONF.alivescore;

                if(player.health < 100){player.health += CONF.healthregen};

                players[_.findIndex(players, {'id': player.id})] = socket.player = player;
                socket.emit('playerInfo', player);
            } else {
                if(player){
                    player.health = 0;
                    clearInterval(playerinterval);
                    player.alive = false;
                    socket.emit('playerInfo', player);
                }
                socket.player.alive = false;
                clearInterval(playerinterval);
            }
        }

    }
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
    (Math.random() <= 0.5) ? player.curdir += CONF.crashturncurdeg : player.curdir -= CONF.crashturndeg;
    (Math.random() <= 0.5) ? player.dir += CONF.crashturndeg : player.dir -= CONF.crashturndeg;
    return player;
}

function crashIsland(player){
    var p = { x: player.x % 1, y: player.y % 1 };
    var deltahalf = { x: Math.abs(p.x - 0.5), y: Math.abs(p.y - 0.5) };
    var median = (deltahalf.x + deltahalf.y) / 2;
    //(player.x % 1) > CONF.islandmargin && (player.x % 1) < (1 - CONF.islandmargin)

    if(median < 0.1){
        player.speed.sail = 0;
    } else {
        player.speed.sail = CONF.initspeed * 2 * (median - 0.1);
    }

    if(0.5 - median > CONF.islandmargin){
        player.health -= CONF.crashislanpain;
    }

    player.sprint = false;
    return player;
}

function findNewPoint(x, y, angle, distance) {
    var result = {};

    result.x = Math.cos(angle * Math.PI / 180) * distance + x;
    result.y = Math.sin(angle * Math.PI / 180) * distance + y;

    return result;
}