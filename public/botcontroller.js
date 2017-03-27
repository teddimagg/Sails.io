window.setInterval(function(){
  if(player.alive){
      // var mouse = {x: event.clientX, y: event.clientY};
      var dir = 90;
      var x = Math.floor(player.x);
      var y = Math.floor(player.y);
      //Checking boundaries
      if(x <= 32){
        dir = goDown();
      } else if(x >= 450 - 35){
        dir = goUp();
      } else if(y <= 32){
        dir = goRight();
      } else if(y >= 450 - 35){
        dir = goLeft();
      } else if(plane){
        if(plane[x+1][y] > 10){
          dir = goUp();
        } else if(plane[x][y+1] < 10){
          dir = goRight();
        } else if(plane[x-1][y] < 10){
          dir = goDown();
        } else {
          dir = goLeft();
        }
      }

      socket.emit('sailing', dir);
  }
}, 1000/60);

function goDown(){
  console.log('going down');
  return Math.floor(Math.random() * 90) + 90 + 45;
}

function goUp(){
  console.log('going up');
  return Math.floor(Math.random() * 90) - 45;
}

function goLeft(){
  console.log('going left');
  return Math.floor(Math.random() * 45) - 90;
}

function goRight(){
  console.log('going right');
  return Math.floor(Math.random() * 90) + 45;
}