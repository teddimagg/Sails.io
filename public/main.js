'use strict';
// ------------------------------------------------------------------------------------- //
    //  ENGINE VARIABLES
// ------------------------------------------------------------------------------------- //
var interval, canvas, ctx, height, width;
var tile = {
    width: 95,  //px
    height: 95  //px
}

var debugMode = true;

// ------------------------------------------------------------------------------------- //
    //  GAME VARIABLES
// ------------------------------------------------------------------------------------- //
var map = {
    x: 450,
    y: 450,
    buffer: 30
};

var playerlist;
var player = {
    x: 30,
    y: 30,
    curdir: 0,
    dir: 0,
    speed: {sail: 0.035, rotate: 1}, //tiles per tick, degs per tick
    alive: false,
    health: 100
}

var plane = null;
var goldplane = null;


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

// ------------------------------------------------------------------------------------- //
    //  LISTENERS AND INITIATORS
// ------------------------------------------------------------------------------------- //
document.addEventListener('DOMContentLoaded', init, false);

$('#play').submit(function(event){
    event.preventDefault();
    playerinit();
});


//Dyynamically alter canvas size
$( window ).resize(function() {
    canvas.height = height = document.body.clientHeight;
    canvas.width = width = document.body.clientWidth;
});

var socket;

function playerinit(){
    player.name = $('#name').val();
    if(player.name){
        player.alive = true;
        socket.emit('add user', player);
        $('.menu').hide();
    }
    socket.on('shipfleet', function(players){
        playerlist = players;
    });
}

function init(){
    updateLeaderboard();
    socket = io();
    // player.id = Math.floor(Math.random() * 9999);
    //Set socket listeners
    socket.on('players', function(data){
        console.log('playerlist updated')
        playerlist = data;
    });

    socket.on('playerInfo', function(p){
        player = p;
    });
    socket.on('mapinit', function(data){
        plane = data;
        console.log(data);
    });

    console.log(playerlist);
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
            if(playerlist.length > 1){
                drawPlayers();
            }
        }
        if(player.alive){
            drawPlayer();
            updateMovements();
        }
        updateLeaderboard();
    }
}

// tengist socket
function mouseController(event){
    var mouse = {x: event.clientX, y: event.clientY};
    var rad = Math.atan2(mouse.y - height / 2, mouse.x - width / 2) * 180 / Math.PI + 90;
    player.dir = rad;
}


// ------------------------------------------------------------------------------------- //
    //  GRAPHICS ENGINE
// ------------------------------------------------------------------------------------- //

function draw(){
    //Exceeds the neseccary number to fill out our screen.

    //Number of tiles from center top sides
    var viewport = {width: Math.ceil(width / tile.width / 2), height: Math.ceil(height / tile.height / 2)}

    var range = {
        x: {
            min: Math.floor(player.x - viewport.width) + 1,
            max: Math.ceil(player.x + viewport.width)
        },
        y: {
            min: Math.floor(player.y - viewport.height),
            max: Math.ceil(player.y + viewport.height)
        }
    }

    //Positional offset and centering
    var offset = {
        player: {x: (player.x % 1) * tile.width, y: (player.y % 1) * tile.height },
        center: {x: width % tile.width / 2, y: height % tile.height / 2}
    }

    var i = {
        x: 0,
        y: 0
    }

    for(var x = range.x.min; x < range.x.max; x++){
        for(var y = range.y.min; y < range.y.max; y++){

            if(x < map.buffer || y < map.buffer || x > map.x - map.buffer || y > map.y - map.buffer){
                ctx.fillStyle = '#00007f';
                ctx.fillRect(i.x * tile.width + offset.center.x - offset.player.x, i.y * tile.height + offset.center.y - offset.player.y, tile.width, tile.height);
            } else {
                if(plane[x][y] < 5){
                    ctx.save();
                    ctx.translate(i.x * tile.width + offset.center.x - offset.player.x + tile.width/2, i.y * tile.height + offset.center.y - offset.player.y + tile.height/2);
                    ctx.rotate(random(x + y) * 180 * Math.PI / 180);
                    // ctx.drawImage(islandImg, -tile.width/2, -tile.height/2, tile.width, tile.height)
                    switch(plane[x][y]){
                        case 0: ctx.drawImage(islandImg, -tile.width/2, -tile.height/2, tile.width, tile.height); break;
                        case 1: ctx.drawImage(islandImg, -tile.width/2, -tile.height/2, tile.width, tile.height); break;
                        case 2: ctx.drawImage(islandImg2, -tile.width/2, -tile.height/2, tile.width, tile.height); break;
                        case 3: ctx.drawImage(islandImg3, -tile.width/2, -tile.height/2, tile.width, tile.height); break;
                        case 4: ctx.drawImage(islandImg4, -tile.width/2, -tile.height/2, tile.width, tile.height); break;
                    }
                    ctx.restore();

                    // ctx.drawImage(islandImg, i.x * tile.width + offset.center.x - offset.player.x, i.y * tile.height + offset.center.y - offset.player.y, tile.width, tile.height);
                    // ctx.fillStyle = '#00007f';
                    // ctx.fillRect(i.x * tile.width + offset.center.x - offset.player.x, i.y * tile.height + offset.center.y - offset.player.y, tile.width, tile.height);
                }
            }
            if(debugMode){
                ctx.fillStyle = '#ffffff';
                ctx.fillText(x + " - " + y, i.x * tile.width + offset.center.x - offset.player.x, i.y * tile.height + offset.center.y - offset.player.y);
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
    ctx.drawImage(playerImg, -(tile.width / 2), -(tile.height / 2), tile.width, tile.height);
    ctx.restore();
}

function drawPlayers(){
    //Number of tiles from center top sides
    var viewport = {width: Math.ceil(width / tile.width / 2), height: Math.ceil(height / tile.height / 2)}
    var range = {
        x: {
            min: Math.floor(player.x - viewport.width) + 1,
            max: Math.ceil(player.x + viewport.width)
        },
        y: {
            min: Math.floor(player.y - viewport.height),
            max: Math.ceil(player.y + viewport.height)
        }
    }

    //Positional offset and centering
    var offset = {
        player: {x: (player.x % 1) * tile.width, y: (player.y % 1) * tile.height },
        center: {x: width % tile.width / 2, y: height % tile.height / 2}
    }

    var i = {
        x: 0,
        y: 0
    }

    // ctx.translate(i.x * tile.width + offset.center.x - offset.player.x, i.y * tile.height + offset.center.y - offset.player.y);
    // console.log(playerlist);

    for(var i = 0; i < playerlist.length; i++){
        if(playerlist[i].id != player.id){
            if(playerlist[i].x > range.x.min && playerlist[i].x < range.x.max){
                // var playeroffset = {x: (playerlist[i].x % 1) * tile.width, y: (playerlist[i].y % 1) * tile.height },
                if(playerlist[i].y > range.y.min && playerlist[i].y < range.y.max){
                    ctx.save();
                    ctx.translate((playerlist[i].x - range.x.min) * tile.width + offset.center.x - offset.player.x, (playerlist[i].y - range.y.min) * tile.height + offset.center.y - offset.player.y);
                    ctx.rotate(playerlist[i].curdir * Math.PI / 180);
                    ctx.drawImage(playerImg, -(tile.width / 2), -(tile.height / 2), tile.width, tile.height);
                    ctx.restore();
                }
            }
        }
    }

}

//
function changeBackgroundColor(){
    context.save();
    context.fillStyle = document.getElementById("backgroundColor").value;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();
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

// ------------------------------------------------------------------------------------- //
    //  GUI
// ------------------------------------------------------------------------------------- //

function updateLeaderboard(){
    var html = '';
    for(var i in playerlist){
        html += '<li>' + playerlist[i].name + '</li>'
    }
    $('.userlist').html(html);
}