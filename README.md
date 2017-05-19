# Sails.io
A real time multiplayer game set at sea. 
With a custom built canvas graphics engine nicely integrated into a Socket.io communications web socket.
In game graphics credits: Daria Yakovleva at ShutterStock


# Live server

```
https://powerful-retreat-19968.herokuapp.com/
```

## Screens
![alt tag](https://i.gyazo.com/1a5b49d40f47cb1426e35d94c7f6b8bc.png)
![alt tag](https://i.gyazo.com/6db009aeeca87ba1a97f09c0d7311d75.png)

## Built With

* [HTML5 canvas](https://www.w3schools.com/html/html5_canvas.asp) - The graphical engine is built on canvas
* [Node.js](https://nodejs.org/en/) - The web framework used
* [Express](https://maven.apache.org/) - Module used to setup static server and routing
* [Socket.io](https://rometools.github.io/rome/) - For real time communications

## Todo
27.03'17
- [x] keep player copy ingame after death
- [x] make corpses pickable by other players
- [x] text feedback on cannonhits
- [x] proximity calculated damage
- [x] setting server side interval
- [x] add bots for testing purposes
- [x] random bot names
- [x] clear wreckages on an interval

28.03'17
- [ ] fix cannonball animation while rotating glitch
- [x] add sprinting cababilities
- [ ] different texture for corpses on sea and on land
- [x] add zoom func to mwheel
- [ ] feed init data (map size etc.) to client
- [ ] register shot and damage on passing ship
- [ ] add suggestion box
