'use strict';
// ------------------------------------------------------------------------------------- //
    //  ENGINE VARIABLES
// ------------------------------------------------------------------------------------- //
var interval, canvas, ctx, height, width;
var tile = {
    width: 95,  //px
    height: 95  //px
}

var debugMode = false;
var range, offset;

// ------------------------------------------------------------------------------------- //
    //  GAME VARIABLES
// ------------------------------------------------------------------------------------- //
var map = {
    x: 450,
    y: 450,
    buffer: 30
};

var playerlist;
var golds;
var player = {
    //init only for lobby purposes
    x: Math.ceil(Math.random() * 330) + 60,
    y: Math.ceil(Math.random() * 330) + 60
};
var plane = null;
var explotions = [];

// ------------------------------------------------------------------------------------- //
    //  GRAPHICAL PRELOAD
// ------------------------------------------------------------------------------------- //
//Graphics variables
var playerImg = new Image()
playerImg.src = 'img/ship.png';
playerImg.onload = function() {console.log('ship built')};

//Islands
var islandImg = new Image(), islandImg2 = new Image(), islandImg3 = new Image(), islandImg4 = new Image();
islandImg.src = 'img/island.png';
islandImg2.src = 'img/island2.png';
islandImg3.src = 'img/island3.png';
islandImg4.src = 'img/island4.png';
islandImg.onload = function() {console.log('island1 loaded')};
islandImg2.onload = function() {console.log('island2 loaded')};
islandImg3.onload = function() {console.log('island3 loaded')};
islandImg4.onload = function() {console.log('island4 loaded')};

//Collectables
var explotionImg = new Image();
explotionImg.src = 'img/fire.png';
explotionImg.onload = function() {console.log('explotions loaded')};

//Debug
var debugImg = new Image();
debugImg.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Square_with_corners.svg/2000px-Square_with_corners.svg.png';
debugImg.onload = function() {console.log('debug loaded')};

// ------------------------------------------------------------------------------------- //
    //  LISTENERS AND INITIATORS
// ------------------------------------------------------------------------------------- //
document.addEventListener('DOMContentLoaded', init, false);
document.addEventListener('keydown', keyController, false);

$('#play').submit(function(event){
    event.preventDefault();
    player.name = $('#name').val();
    if(player.name){
        playerinit(player.name);
    }
});


//Dyynamically alter canvas size
$( window ).resize(function() {
    canvas.height = height = document.body.clientHeight;
    canvas.width = width = document.body.clientWidth;
});

var socket;

function playerinit(name){
    $('.users').show();
    socket.emit('add user', name);
    $('.menu').hide();
    $('.healthbox').show();
}

function init(){
    socket = io();

    //Set socket listeners
    socket.on('players', function(data){
        console.log('playerlist updated')
        playerlist = data;
    });

    socket.on('playerInfo', function(p){
        player = p;
    });

    // socket.on('golds', function(data){
    //     golds = data;
    // });

    socket.on('mapinit', function(data){
        plane = data;
    });

    socket.on('shipfleet', function(players){
        playerlist = players;
    });

    socket.on('disconnect', gameReset);

    canvas = document.querySelector('canvas');
    canvas.addEventListener('mousemove', mouseController, false);

    ctx = canvas.getContext('2d');

    canvas.height = height = document.body.clientHeight;
    canvas.width = width = document.body.clientWidth;

    interval = window.setInterval(tick, 1000 / 60);
}

function tick(){
    if(plane && player){ //loading
        ctx.clearRect(0, 0, width, height);
        drawBackground();
        draw();
        if(playerlist){
            if(playerlist.length > 0){ drawPlayers(); }
            // if(golds.length > 0){ drawGolds(); }
        }
        if(player.alive){
            drawPlayer();
            updateMovements();
            updateLeaderboard();
        }
    }
}

// tengist socket
function mouseController(event){
    if(player.alive){
        var mouse = {x: event.clientX, y: event.clientY};
        var rad = Math.atan2(mouse.y - height / 2, mouse.x - width / 2) * 180 / Math.PI + 90;
        player.dir = rad;
    }
}


// ------------------------------------------------------------------------------------- //
    //  GRAPHICS ENGINE
// ------------------------------------------------------------------------------------- //
var once = true;

function draw(){
    //Number of tiles from center to sides
    var viewport = {width: Math.ceil(width / tile.width), height: Math.ceil(height / tile.height)}
    range = {
        x: {
            min: Math.floor(player.x - viewport.width / 2),
            max: Math.floor(player.x + viewport.width / 2)
        },
        y: {
            min: Math.floor(player.y - viewport.height / 2),
            max: Math.floor(player.y + viewport.height / 2)
        }
    }

    //Positional offset and centering
    offset = {
        player: {x: (player.x % 1) * tile.width, y: (player.y % 1) * tile.height },
        center: {}
    }

    //Odd vs even viewport corrections
    if(viewport.width % 2 == 1){
        offset.center.x = width % tile.width / 2;
        if((player.x % 1) > 0.5){ range.x.min--; } //Odd number correction
    } else {
        offset.center.x = (width / 2) % tile.width;
    }

    if(viewport.height % 2 == 1){
        offset.center.y = height % tile.height / 2;
        if((player.y % 1) > 0.5){ range.y.min--; } //Odd number correction
    } else {
        offset.center.y = (height / 2) % tile.height;
    }

    //Converting rational offset to pixels dynamically
    if(offset.center.x){ offset.center.x = tile.width - offset.center.x; }
    if(offset.center.y){ offset.center.y = tile.height - offset.center.y; }

    //Debug menu
    if(once && debugMode){
        console.log(width, height);
        console.log(viewport);
        console.log(range);
        console.log(offset);
        once = false;
    }

    //Secondary iterators
    var i = {
        x: 0,
        y: 0
    }

    //The screen loop
    for(var x = range.x.min; x <= range.x.max; x++){
        for(var y = range.y.min; y <= range.y.max; y++){
            //Out of boundaries printing
            if(x < map.buffer || y < map.buffer || x > map.x - map.buffer || y > map.y - map.buffer){
                ctx.fillStyle = '#00007f';
                ctx.fillRect(
                    i.x * tile.width  - offset.center.x - offset.player.x, //xpos
                    i.y * tile.height - offset.center.y - offset.player.y, //ypos
                    tile.width, tile.height //x,y size
                );
            } else {
                if(plane[x][y] < 5){
                    ctx.save();
                    ctx.translate(
                        i.x * tile.width  - offset.center.x - offset.player.x + tile.width/2, //x
                        i.y * tile.height - offset.center.y - offset.player.y + tile.height/2 //y
                    );
                    ctx.rotate(random(x + y) * 180 * Math.PI / 180);
                    switch(plane[x][y]){
                        case 0: ctx.drawImage(islandImg,  -tile.width/2, -tile.height/2, tile.width, tile.height); break;
                        case 1: ctx.drawImage(islandImg,  -tile.width/2, -tile.height/2, tile.width, tile.height); break;
                        case 2: ctx.drawImage(islandImg2, -tile.width/2, -tile.height/2, tile.width, tile.height); break;
                        case 3: ctx.drawImage(islandImg3, -tile.width/2, -tile.height/2, tile.width, tile.height); break;
                        case 4: ctx.drawImage(islandImg4, -tile.width/2, -tile.height/2, tile.width, tile.height); break;
                    }
                    ctx.restore();
                }
            }

            if(debugMode){
                ctx.fillStyle = '#ffffff';
                ctx.drawImage(debugImg    , i.x * tile.width - offset.center.x - offset.player.x    , i.y * tile.height - offset.center.y - offset.player.y     , tile.width, tile.height);
                ctx.fillText(x + " - " + y, i.x * tile.width - offset.center.x - offset.player.x + 5, i.y * tile.height - offset.center.y - offset.player.y + 15, tile.width, tile.height);
            }
            i.y++;
        }
        i.y = 0;
        i.x++;
    }
}

function random(seed) {
    var x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

function drawPlayer(){
    ctx.save();
    ctx.translate((width / 2), (height / 2));
    ctx.rotate(player.curdir * Math.PI / 180);

    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth=3;
    ctx.beginPath();
    ctx.arc(
        0,
        0,
        200,
        -0.125*Math.PI,
        0.125*Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(
        0,
        0,
        200,
        0.875*Math.PI,
        1.125*Math.PI);
    ctx.stroke();

    ctx.drawImage(playerImg, -(tile.width / 2), -(tile.height / 2), tile.width, tile.height);
    ctx.restore();
}

function drawPlayers(){
    //Positional offset and centering
    for(var i = 0; i < playerlist.length; i++){
        if(playerlist[i].id != player.id){
            //Checks if current ship is in render distance
            if(playerlist[i].x > range.x.min - 1 && playerlist[i].x < range.x.max + 1 && playerlist[i].y > range.y.min - 1 && playerlist[i].y < range.y.max + 1){
                ctx.save();
                ctx.translate(
                    (playerlist[i].x - range.x.min) * tile.width - offset.center.x - offset.player.x,   //X
                    (playerlist[i].y - range.y.min) * tile.height - offset.center.y - offset.player.y   //Y
                );
                ctx.rotate(playerlist[i].curdir * Math.PI / 180);
                ctx.drawImage(playerImg, -(tile.width / 2), -(tile.height / 2), tile.width, tile.height);
                ctx.restore();

                ctx.save();
                ctx.translate(
                    (playerlist[i].x - range.x.min) * tile.width - offset.center.x - offset.player.x,   //X
                    (playerlist[i].y - range.y.min) * tile.height - offset.center.y - offset.player.y   //Y
                );
                //Drawing name and healthbar
                ctx.fillStyle = 'rgba(50,205,50,0.5)';
                ctx.fillRect(-(tile.height / 4), -(tile.height / 2), tile.width / 2, tile.height / 10);
                ctx.fillStyle = '#32CD32';
                ctx.fillRect(-(tile.height / 4), -(tile.height / 2), (tile.width / 2)*(playerlist[i].health / 100), tile.height / 12);
                ctx.fillStyle = '#ffffff';
                ctx.textAlign="center";
                ctx.fillText(playerlist[i].name, 0, -(tile.height / 2));
                ctx.fillStyle = '#ffffff';
                ctx.restore();
            }
        }
    }

    //projectiles
    for(var i = 0; i < playerlist.length; i++){
        //Checks if current ship is in render distance
        if(playerlist[i].x > range.x.min - 1 && playerlist[i].x < range.x.max + 1 && playerlist[i].y > range.y.min - 1 && playerlist[i].y < range.y.max + 1){
            if(playerlist[i].attack.left.progr && playerlist[i].attack.left.progr < 10){
                ctx.save();
                ctx.translate(
                    (playerlist[i].attack.left.x - range.x.min) * tile.width - offset.center.x - offset.player.x,   //X
                    (playerlist[i].attack.left.y - range.y.min) * tile.height - offset.center.y - offset.player.y   //Y
                );
                ctx.drawImage(explotionImg, Math.floor(playerlist[i].attack.left.progr / 2) * 128, 0, 128, 128, -(tile.width/2), -(tile.height/2), (tile.width), (tile.height));
                ctx.restore();
            }

            if(playerlist[i].attack.right.progr && playerlist[i].attack.right.progr < 10){
                ctx.save();
                ctx.translate(
                    (playerlist[i].attack.right.x - range.x.min) * tile.width - offset.center.x - offset.player.x,   //X
                    (playerlist[i].attack.right.y - range.y.min) * tile.height - offset.center.y - offset.player.y   //Y
                );
                ctx.drawImage(explotionImg, Math.floor(playerlist[i].attack.right.progr / 2) * 128, 0, 128, 128, -(tile.width/2), -(tile.height/2), (tile.width), (tile.height));
                ctx.restore();
            }

            // if(playerlist[i].attack.left.progr){
            //     ctx.save();
            //     ctx.translate(
            //         (playerlist[i].attack.left.origx - range.x.min) * tile.width - offset.center.x - offset.player.x,   //X
            //         (playerlist[i].attack.left.origy - range.y.min) * tile.height - offset.center.y - offset.player.y   //Y
            //     );
            //     ctx.fillStyle = '#ffffff';
            //     ctx.beginPath();
            //     ctx.moveTo(0,0);
            //     ctx.lineTo((playerlist[i].attack.left.x - playerlist[i].attack.left.origx) * tile.width, (playerlist[i].attack.left.y - playerlist[i].attack.left.origy) * tile.height);
            //     ctx.stroke();
            //     ctx.restore();
            // }

            // if(playerlist[i].attack.right.progr){
            //     ctx.save();
            //     ctx.translate(
            //         (playerlist[i].attack.right.origx - range.x.min) * tile.width - offset.center.x - offset.player.x,   //X
            //         (playerlist[i].attack.right.origy - range.y.min) * tile.height - offset.center.y - offset.player.y   //Y
            //     );
            //     ctx.fillStyle = '#ffffff';
            //     ctx.beginPath();
            //     ctx.moveTo(0,0);
            //     ctx.lineTo((playerlist[i].attack.right.x - playerlist[i].attack.right.origx) * tile.width, (playerlist[i].attack.right.y - playerlist[i].attack.right.origy) * tile.height);
            //     ctx.stroke();
            //     ctx.restore();
            // }


            // ctx.rotate(playerlist[i].curdir * Math.PI / 180);
            // ctx.drawImage(playerImg, -(tile.width / 2), -(tile.height / 2), tile.width, tile.height);
            // ctx.restore();

            // ctx.save();
            // ctx.translate(
            //     (playerlist[i].x - range.x.min) * tile.width - offset.center.x - offset.player.x,   //X
            //     (playerlist[i].y - range.y.min) * tile.height - offset.center.y - offset.player.y   //Y
            // );
            // //Drawing name and healthbar
            // ctx.fillStyle = 'rgba(50,205,50,0.5)';
            // ctx.fillRect(-(tile.height / 4), -(tile.height / 2), tile.width / 2, tile.height / 10);
            // ctx.fillStyle = '#32CD32';
            // ctx.fillRect(-(tile.height / 4), -(tile.height / 2), (tile.width / 2)*(playerlist[i].health / 100), tile.height / 12);
            // ctx.fillStyle = '#ffffff';
            // ctx.textAlign="center";
            // ctx.fillText(playerlist[i].name, 0, -(tile.height / 2));
            // ctx.restore();
        }
    }
}

function drawGolds(){
    //Positional offset and centering
    for(var i = 0; i < golds.length; i++){
        //Checks if current ship is in render distance
        if(golds[i].x > range.x.min - 1 && golds[i].x < range.x.max + 1 && golds[i].y > range.y.min - 1 && golds[i].y < range.y.max + 1){
            ctx.save();
            ctx.translate(
                (golds[i].x - range.x.min) * tile.width - offset.center.x - offset.player.x,   //X
                (golds[i].y - range.y.min) * tile.height - offset.center.y - offset.player.y   //Y
            );
            ctx.drawImage(goldImg, -(tile.width / 4), -(tile.height / 4), tile.width / 2, tile.height / 2);
            ctx.restore();
        }
    }
}

function drawBackground(){
    ctx.fillStyle = '#70b6eb';
    ctx.fillRect(0, 0, width, height);
}

// ------------------------------------------------------------------------------------- //
    //  LOGICAL
// ------------------------------------------------------------------------------------- //

function updateMovements(){
    socket.emit('sailing', player.dir);
}

function gameReset(){
    player = {
        //init only for lobby purposes
        x: Math.ceil(Math.random() * 330) + 60,
        y: Math.ceil(Math.random() * 330) + 60
    };

    //TODO: Gaining socket connection again not working!
    socket = io();
    $('.menu').show();
    $('.users').hide();
    $('.healthbox').hide();
}

function keyController(event){
    //a 65
    //d 68
    if(player.alive){
        if(event.keyCode == 65){ socket.emit('fire', 'left'); }
        if(event.keyCode == 68){ socket.emit('fire', 'right'); }
    }
}

// ------------------------------------------------------------------------------------- //
    //  GUI
// ------------------------------------------------------------------------------------- //

function updateLeaderboard(){
    var html = '';
    for(var i in playerlist){
        html += '<li>' + playerlist[i].name + '</li>'
    }

    $('.userlist').html(html);
    $('.health').css('width', player.health + '%');
}