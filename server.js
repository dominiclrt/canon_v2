// Dependencies
let express = require('express');
let http = require('http');
let path = require('path');
let socketIO = require('socket.io');
let request = require('request');

const app = express();
let server = http.Server(app);
const io = socketIO(server);

let CANVAS_WIDTH = 1080; //Canvas width
let CANVAS_HEIGHT = 720; //Canvas height

let TANK_WIDTH = 40;
let TANK_HEIGHT = 40;

/*
Place holder object
 */
let placeholder = {
  x: 0,
  y: 0,
  width: 0,
  height: 0
};

let bullets = [];
let players = {};
let tanks = {
  brown: false,
  red: false,
  blue: false,
  green: false,
  pink: false,
  orange: false,
  purple: false,
  white: false
};

app.set('port', 8080);
app.use('/client', express.static(__dirname + '/client'));
app.use('/img', express.static(__dirname + '/img'));

// Routing
app.get('/', function(request, response) {
  response.sendFile(path.join(__dirname, 'index.html'));
});

// Starts the server.
server.listen(process.env.PORT || 8080, function() {
  console.log('Starting server on port 8080');
});

// Add the WebSocket handlers

/*
Spawns objects randomly on game board. Visbile for all users connected
 */
function spawn(object){
  let newX;
  let newY;
  let successful = false;
  let colliding;

  while(!successful) {
    newX = Math.floor(Math.random() * (CANVAS_WIDTH - object.width));
    newY = Math.floor(Math.random() * (CANVAS_HEIGHT - object.height));

    //attempt to move dummy object to new spawn
    placeholder.height = object.height;
    placeholder.width = object.width;
    placeholder.x = newX;
    placeholder.y = newY;

    colliding = getObjCollisions(placeholder).length;
    if(colliding == 0) //no collisions
    {
      object.x = newX;
      object.y = newY;
      successful = true;
      break;
    }
  }
}

/*
Returns center point of an object
 */
function getCenter(object){
  center = {
    x: (object.x + (object.width/2)),
    y: (object.y + (object.height/2))
  }
  return center;
}

/*
Returns a new player and assigns the player a tank color.
 */
function createNewPlayer(newColor, USER){
  let newPlayer = {
    x: 0,
    y: 0,
    width: TANK_WIDTH,
    height: TANK_HEIGHT,
    angle: Math.random() * (2 * Math.PI),
    speed: 0,
    name: USER,
    color: newColor,
    reloading: false,
    dead: 0,
    weaponPowerUp: 0,
    speedUp: 0,
    health: 3,
    score: 0
  };
  spawn(newPlayer);
  return newPlayer;
}

/*
Checks if two objects are colliding
 */
function areColliding(object1, object2){
  if(object1.x < object2.x + object2.width &&
    object1.x + object1.width > object2.x &&
    object1.y < object2.y + object2.height &&
    object1.height + object1.y > object2.y)
  { //detected collision
    return true;
  }
  return false;
}

/*
Checks for bullets colliding with objects or end of map
 */
function checkProjCollision(index){
  let proj = bullets[index];
  let collided = false;

  for (let id in players) {
    let player = players[id];
    if (areColliding(player, proj) && proj.color != player.color && player.dead == 0) {
      bullets.splice(index, 1);
      players[id].health -= 1;
      collided = true;
      if (players[id] != null && players[proj.id] != null && players[id].health <= 0) {
        players[id].dead = 36;
        players[id].health = 3;
        if (players[id].score <0){
          players[id].score = 0;
        }
        players[proj.id].score += 1;
      }
      break;
    }
  }

}

/*
Returns list of objects that have collided
 */
function getObjCollisions(obj) {

  let collidingObjs = [];
  for (let id in players) {
    let otherPlayer = players[id];
    if (obj != players[id]) {
      if (areColliding(obj, otherPlayer) && otherPlayer.dead == 0) {
        collidingObjs.push(otherPlayer);
      }
    }
  }
  return collidingObjs;
}

/*
Returns objects boundaries (personal space)
 */
function getObjEdges(object){
  let objCen = getCenter(object);
  let edges={
    top: objCen.y - (object.height/2),
    right: objCen.x + (object.width/2),
    bottom: objCen.y + (object.height/2),
    left: objCen.x - (object.width/2)
  }
  return edges;
}

/*
Returns directions a tank can move if being obstructed by another tank or game boundaries
 */
function getAvailDirections(collidingObjs, player){
  let availDirections = {left: true, right: true, up: true, down: true};

  for(let i = 0; i < collidingObjs.length; ++i){
    let obj = collidingObjs[i];
    let playerCenter = getCenter(player);
    let objEdges = getObjEdges(obj);
    let pHalfWidth = player.width/2;
    let pHalfHeight = player.height/2;

    if((objEdges.right < playerCenter.x) && (playerCenter.y - 15 < objEdges.bottom && playerCenter.y + 15 > objEdges.top)){
      availDirections.left = false;
    }
    if((objEdges.left > playerCenter.x)&& (playerCenter.y - 15 < objEdges.bottom && playerCenter.y + 15 > objEdges.top)){
      availDirections.right = false;
    }
    if((objEdges.bottom < playerCenter.y) && (playerCenter.x - 15 < objEdges.right && playerCenter.x + 15 > objEdges.left)){
      availDirections.up = false;
    }
    if((objEdges.top > playerCenter.y) && (playerCenter.x - 15 < objEdges.right && playerCenter.x + 15 > objEdges.left)){
      availDirections.down = false;
    }
  }
  return availDirections;
}

/*
Ensures players can't step outside of bounds
 */
function correctPlayerPosition(){
  for(let id in players){
    let player = players[id];
    if(player.x >= (CANVAS_WIDTH-40)){
      player.x = CANVAS_WIDTH-40;
    }
    if(player.y >= (CANVAS_HEIGHT-40)){
      player.y = CANVAS_HEIGHT-40;
    }
  }
}

/*
Updates bullets being shot
 */
function updateProjectiles(){
  for(let i = 0; i < bullets.length; ++i){
    let proj = bullets[i];
    let outOfBounds = false;
    let deltaX = proj.speed * Math.cos(proj.angle);
    let deltaY = proj.speed * Math.sin(proj.angle);

    if ((deltaX >= 0 && proj.x <= (CANVAS_WIDTH - 20)) || (deltaX <= 0 && proj.x >= 0)) {
      proj.x += deltaX;
    }
    else {
      bullets.splice(i, 1);
      outOfBounds = true;
    }
    if ((deltaY >= 0 && proj.y <= (CANVAS_HEIGHT - 20)) || (deltaY <= 0 && proj.y >= 5)) {
      proj.y += deltaY;
    }
    else {
      bullets.splice(i, 1);
      outOfBounds = true;
    }
    if(!outOfBounds){
      checkProjCollision(i)
    }
  }
}

/*
Updates player position when moving
 */
function updatePlayerPos(player){
  if(player != null) {
    let deltaX = player.speed * Math.cos(player.angle);
    let deltaY = player.speed * Math.sin(player.angle);

    let collidingObjs = getObjCollisions(player);
    let availDirections = getAvailDirections(collidingObjs, player);


    if ((deltaX >= 0 && player.x <= (CANVAS_WIDTH - 40) && availDirections.right) || (deltaX <= 0 && player.x >= 0 && availDirections.left)) {
      player.x += deltaX;
    }
    if ((deltaY >= 0 && player.y <= (CANVAS_HEIGHT - 40) && availDirections.down) || (deltaY <= 0 && player.y >= 5) && availDirections.up) {
      player.y += deltaY;
    }
  }
}

io.on('connection', function(socket){
	socket.on('new-user', function (data) {
		players[socket.id].name = data;
	});

  socket.on('new player', function() {
    let newColor;
    if(tanks.brown == false){
      newColor = 'brown';
      tanks.brown = true;
    }
    else if(tanks.red == false){
      newColor = 'red';
      tanks.red = true;
    }
    else if(tanks.blue == false){
      newColor = 'blue';
      tanks.blue = true;
    }
    else if(tanks.green == false){
      newColor = 'green';
      tanks.green = true;
    }
    else if(tanks.pink == false){
      newColor = 'pink';
      tanks.pink = true;
    }
    else if(tanks.orange == false){
      newColor = 'orange';
      tanks.orange = true;
    }
    else if(tanks.purple == false){
      newColor = 'purple';
      tanks.purple = true;
    }
    else if(tanks.white == false){
      newColor = 'white';
      tanks.white = true;
    }
    else
      newColor = 'brown';
    players[socket.id] = createNewPlayer(newColor, 'unknown');
    console.log("Player " + socket.id + " connected with coordinates: " + players[socket.id].x + ", " + players[socket.id].y);

    socket.on('disconnect', function() {
      console.log(socket.id + " disconnected");
      correctPlayerPosition();
      let color = players[socket.id].color;
      tanks[color] = false;
      delete players[socket.id];
    });
  });

  socket.on('controls', function(data) {
    let player = players[socket.id] || {};

    if(player.dead == 0) {
      if (data.shoot && player.reloading <= 0) {
        bullets.push({
          id: socket.id,
          color: player.color,
          x: player.x + 15,
          y: player.y + 20,
          angle: player.angle,
          width: 5,
          height: 5,
          speed: 8
        });
        player.reloading = 60;
      }

      if (data.left) {
        if (player.angle >= .05) {
          player.angle -= .05;
        }
        else
          player.angle = 2 * Math.PI;
      }
      if (data.up) {
        if(player.speedUp <= 0) {
          player.speed = 3;
        }
        else{
          player.speed = 4.5;
        }
      }
      if (data.right) {
        if (player.angle <= 2 * Math.PI) {
          player.angle += .05;
        }
        else
          player.angle = 0;

      }
      if (data.down) {
        if(player.speedUp <= 0) {
          player.speed = -3;
        }
        else{
          player.speed = -4.5;
        }
      }
    }
    updatePlayerPos(players[socket.id]);
    player.speed = 0;
    player.reloading -= 1; //tick down each frame
  });
});

setInterval(function() {
  for(let id in players){
    let player = players[id];
    player.reloading -= 1;
    if(player.dead > 0) {
	  player.dead -= 1;
      if(player.dead == 0){//if the player is now alive, spawn in random spot
        spawn(player);
      }
    }
  }
  updateProjectiles();
  io.sockets.emit('state', players, bullets, CANVAS_WIDTH, CANVAS_HEIGHT);
}, 1000 / 60);


/**
 * API CALLS
 */

function put_req_tanks(userData, user_id) {
  var url ='http://tankgame-api.herokuapp.com/api/tanks/' + user_id;

  var options = {
    method: 'PUT',
    body: userData,
    json: true,
    url: url,
  }
  
  request(options, function(error, response, body) {
      if (response.statusCode == 200) {
        console.log(body)
      } else {
        console.log('error: ' + response.statusCode)
      }
    })
}

/**
 * 
 * API CALLS
 */

function get_req_tanks_id(user_id) {
  var url ='http://tankgame-api.herokuapp.com/api/tanks/' + user_id
  request({
        method: 'GET',
        uri: url
      }, function(error, response, body) {
        if (response.statusCode == 200) {
          console.log(body)
          return body;
        } else {
          console.log('error: ' + response.statusCode)
          return null;
        }
      })
}


function get_req_highscores() {
  request({
    method: 'GET',
    uri: 'http://tankgame-api.herokuapp.com/api/highscores'
  }, function(error, response, body) {
    if (response.statusCode == 200) {
      return (body);
    } else {
      console.log('error: ' + response.statusCode)
      return null;
    }
  })
}

 function put_req_highscores(userData) {
  request({
    method: 'PUT',
    uri: 'http://tankgame-api.herokuapp.com/api/highscores',
    multipart: [{
      'content-type': 'application/json',
      body: JSON.stringify(userData),
    }]
  }, function(error, response, body) {
    if (response.statusCode == 200) {
      console.log(body);
    } else {
      console.log('error: ' + response.statusCode)
    }
  })
}

function post_req_tanks(userData){
  var url = 'http://tankgame-api.herokuapp.com/api/tanks'
  var options = {
    method: 'post',
    body: userData,
    json: true,
    url: url
  }
  request(options, function (err, res, body) {
    if (err) {
      console.error('error posting json: ', err)
      throw err
    }
    var headers = res.headers
    var statusCode = res.statusCode
    console.log('headers: ', headers)
    console.log('statusCode: ', statusCode)
    console.log('body: ', body)
  })
}