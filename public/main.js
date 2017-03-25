'use strict';
//Engine variables
var interval, canvas, ctx, height, width;
var tile = {
    width: 95,  //px
    height: 95  //px
}

//Game variables
var map = {
    x: 50,
    y: 50
};

var playerlist;
var player = {
    x: 50,
    y: 50,
    curdir: 0,
    dir: 0,
    speed: {sail: 0.1, rotate: 3},
    alive: false
}

var plane = null;

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

//Event listeners
document.addEventListener('DOMContentLoaded', init, false);

$('.play').click(function(){
    playerinit();
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
    });

    socket.on('shipfleet', function(players){
        playerlist = players;
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

function draw(){
    //Exceeds the neseccary number to fill out our screen.

    //Number of tiles from center top sides
    var viewport = {width: Math.ceil(width / tile.width / 2) + 1, height: Math.ceil(height / tile.height / 2) + 1}
    var range = {
        x: {
            min: Math.floor(player.x - viewport.width),
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

            if(plane[x][y] < 5){
                ctx.save();
                ctx.translate(i.x * tile.width + offset.center.x - offset.player.x, i.y * tile.height + offset.center.y - offset.player.y);
                ctx.rotate(random(x + y) * 180 * Math.PI / 180);
                switch(plane[x][y]){
                    case 1: ctx.drawImage(islandImg, -(tile.width / 2), -(tile.height / 2), tile.width, tile.height); break;
                    case 2: ctx.drawImage(islandImg2, -(tile.width / 2), -(tile.height / 2), tile.width, tile.height); break;
                    case 3: ctx.drawImage(islandImg3, -(tile.width / 2), -(tile.height / 2), tile.width, tile.height); break;
                    case 4: ctx.drawImage(islandImg4, -(tile.width / 2), -(tile.height / 2), tile.width, tile.height); break;
                }
                ctx.restore();

                // ctx.drawImage(islandImg, i.x * tile.width + offset.center.x - offset.player.x, i.y * tile.height + offset.center.y - offset.player.y, tile.width, tile.height);
                // ctx.fillStyle = '#00007f';
                // ctx.fillRect(i.x * tile.width + offset.center.x - offset.player.x, i.y * tile.height + offset.center.y - offset.player.y, tile.width, tile.height);
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
    var viewport = {width: Math.ceil(width / tile.width / 2) + 1, height: Math.ceil(height / tile.height / 2) + 1}
    var range = {
        x: {
            min: Math.floor(player.x - viewport.width),
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
                    ctx.translate((playerlist[i].x - range.x.min - 2) * tile.width + offset.center.x - offset.player.x, (playerlist[i].y - range.y.min - 1) * tile.height + offset.center.y - offset.player.y);
                    ctx.rotate(playerlist[i].curdir * Math.PI / 180);
                    ctx.drawImage(playerImg, -(tile.width / 2), -(tile.height / 2), tile.width, tile.height);
                    ctx.restore();
                }
            }
        }
    }

}

function mouseController(event){
    var mouse = {x: event.clientX, y: event.clientY};
    var rad = Math.atan2(mouse.y - height / 2, mouse.x - width / 2) * 180 / Math.PI + 90;
    player.dir = rad;
}

function changeBackgroundColor(){
    context.save();
    context.fillStyle = document.getElementById("backgroundColor").value;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();
}

function updateMovements(){
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


    player.curdir += rotation;
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
    sail(move);
    socket.emit('sailing', function(player){
        console.log(data);
    });
}

function drawBackground(){
    ctx.fillStyle = '#70b6eb';
    ctx.fillRect(0, 0, width, height);
}

function sail(move){
    player.x += move.x;
    player.y += move.y;

    socket.emit('sailing', player);
}

function updateLeaderboard(){
    var html = '';
    for(var i in playerlist){
        html += '<li>' + playerlist[i].name + '</li>'
    }
    $('.userlist').html(html);
}
