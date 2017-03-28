var pirates = [
'Barbarossa',
'Sir Francis Drake',
"L'Olonnais.",
'Henry Morgan',
'Captain Kidd',
'Blackbeard',
'Calico Jack',
'Madame Cheng'];

document.addEventListener('DOMContentLoaded', bot, false);

function bot(){
  var dir = 0;
  var hasclicked = false;
  window.setInterval(function(){
    if(player.alive){
        // var mouse = {x: event.clientX, y: event.clientY};
        var x = Math.floor(player.x);
        var y = Math.floor(player.y);

        if(plane[x][y] > 10){
          //Checking boundaries
          if(y <= 40){
            console.log('avoiding boundaries - down');
            dir = goDown();
          } else if(y >= 250 - 40){
            console.log('avoiding boundaries - up');
            dir = goUp();
          } else if(x <= 40){
            console.log('avoiding boundaries - right');
            dir = goRight();
          } else if(x >= 250 - 40){
            console.log('avoiding boundaries - left');
            dir = goLeft();
          } else if(plane){
            var d = Math.floor((Math.random() * 4))

            switch(d){
              case 0:
                if(plane[x][y+1] > 10 && plane[x][y+2] > 10 && plane[x+1][y+1] && plane[x-1][y+1] > 10){ dir = goUp(); } else { dir = goDown(); console.log('avoiding island - up'); };
              case 1:
                if(plane[x+1][y] > 10 && plane[x+2][y] > 10 && plane[x+1][y+1] > 10 && plane[x+1][y-1] > 10){ dir = goRight(); } else { dir = goLeft(); console.log('avoiding island - right'); };
              case 2:
                if(plane[x][y-1] > 10 && plane[x][y-2] > 10 && plane[x+1][y-1] > 10 && plane[x-1][y-1] > 10){ dir = goDown(); } else { dir = goUp(); console.log('avoiding island - down'); };
              case 3:
                if(plane[x-1][y] > 10 && plane[x-2][y] > 10 && plane[x-1][y-1] > 10 && plane[x-1][y+1] > 10){ dir = goLeft(); } else { dir = goRight(); console.log('avoiding island - left'); };
            }
          }

          // console.log('sailing');
          socket.emit('sailing', dir);
        }
    } else {
      if(!hasclicked){
        $('#name').val(pirates[Math.floor(Math.random() * pirates.length)]);
        $('.play').click();
        hasclicked = true;
        setTimeout(function() {
          hasclicked = false;
        }, 10000);
      }
    }
  }, 200);
}

function goDown(){
  // console.log('going down');
  return Math.floor(Math.random() * 90) + 90 + 45;
  // return 180;
}

function goUp(){
  // console.log('going up');
  return Math.floor(Math.random() * 90) - 45;
  // return 0;
}

function goLeft(){
  // console.log('going left');
  return Math.floor(Math.random() * 45) - 90;
  // return -90;
}

function goRight(){
  // console.log('going right');
  return Math.floor(Math.random() * 90) + 45;
  // return 90;
}