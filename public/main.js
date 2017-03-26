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
    // x: Math.ceil(Math.random() * 330) + 60,
    // y: Math.ceil(Math.random() * 330) + 60,
    x: 120,
    y: 120,
    curdir: 0,
    dir: 0,
    speed: {sail: 0, rotate: 1}, //tiles per tick, degs per tick
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

//Debug
var debugImg = new Image();
debugImg.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Square_with_corners.svg/2000px-Square_with_corners.svg.png';
debugImg.onload = function() {console.log('debug loaded')};

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

    socket.on('shipfleet', function(players){
        playerlist = players;
    });

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
            if(playerlist.length > 0){
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
var once = true;

function draw(){
    //Exceeds the neseccary number to fill out our screen.

    //Number of tiles from center top sides
    var viewport = {width: Math.ceil(width / tile.width), height: Math.ceil(height / tile.height)}
    //if(viewport.height % 2 == 0){ viewport.height++ };
    //if(viewport.width % 2 == 0){ viewport.width++ };

    var range = {
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
    var offset = {
        player: {x: (player.x % 1) * tile.width, y: (player.y % 1) * tile.height },
        center: {}
    }


    if(viewport.width % 2 == 1){
        offset.center.x = width % tile.width / 2;
    } else {
        offset.center.x = (width / 2) % tile.width;
    }
    if(viewport.height % 2 == 1){
        offset.center.y = height % tile.height / 2;
    } else {
        offset.center.y = (height / 2) % tile.height;
    }

    if(offset.center.x){ offset.center.x = tile.width - offset.center.x; }
    if(offset.center.y){ offset.center.y = tile.height - offset.center.y; }

    var i = {
        x: 0,
        y: 0
    }

    if(once){
        console.log(width, height);
        console.log(viewport);
        console.log(range);
        console.log(offset);
        once = false;
    }

    for(var x = range.x.min; x <= range.x.max; x++){
        for(var y = range.y.min; y <= range.y.max; y++){
            if(debugMode){
                ctx.fillStyle = '#ffffff';
                ctx.drawImage(debugImg    , i.x * tile.width - offset.center.x    , i.y * tile.height - offset.center.y     , tile.width, tile.height);
                ctx.fillText(x + " - " + y, i.x * tile.width - offset.center.x + 5, i.y * tile.height - offset.center.y + 15, tile.width, tile.height);
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