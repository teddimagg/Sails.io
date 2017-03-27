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
          if(y <= 32){
            console.log('avoiding boundaries - down');
            dir = goDown();
          } else if(y >= 450 - 35){
            console.log('avoiding boundaries - up');
            dir = goUp();
          } else if(x <= 32){
            console.log('avoiding boundaries - right');
            dir = goRight();
          } else if(x >= 450 - 35){
            console.log('avoiding boundaries - left');
            dir = goLeft();
          } else if(plane){
            var d = Math.floor((Math.random() * 4))

            switch(d){
              case 0:
                if(plane[x][y+1] > 10 && plane[x][y+2] > 10){ dir = goUp(); } else { dir = goDown(); };
                break;
              case 1:
                if(plane[x+1][y] > 10 && plane[x+2][y] > 10){ dir = goRight(); } else { dir = goLeft(); };
                break;
              case 2:
                if(plane[x][y-1] > 10 && plane[x][y-2] > 10){ dir = goDown(); } else { dir = goUp(); };
                break;
              case 3:
                if(plane[x-1][y] > 10 && plane[x-2][y] > 10){ dir = goLeft(); } else { dir = goRight(); };
                break;
            }
          }

          socket.emit('sailing', dir);
        }
    } else {
      if(!hasclicked){
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
}

function goUp(){
  // console.log('going up');
  return Math.floor(Math.random() * 90) - 45;
}

function goLeft(){
  // console.log('going left');
  return Math.floor(Math.random() * 45) - 90;
}

function goRight(){
  // console.log('going right');
  return Math.floor(Math.random() * 90) + 45;
}