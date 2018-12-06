var socket = io();
var canvas = document.getElementById('canvas');
var context = canvas.getContext('2d');
let request = require('request')

username = document.getElementById('username-field');
username.addEventListener('keydown', function(event) {
  url_string = window.location.href
  token = url_string.split("?t=")
  if(token.length == 2){
    USER = token[1];
    hideModal();
    socket.emit('new-user', USER);
  }
  else{
    if(event.key == 'Enter') {
      let value = username.value;
      if(value != "") {
        USER = value;
        hideModal();
        socket.emit('new-user', USER);
      }
    }
  }
});

/*
Hide nickname prompt after being filled out
 */
function hideModal() {
	let backdrop = document.getElementsByClassName('modal-backdrop')[0];
	let modal = document.getElementsByClassName('modal')[0];
	backdrop.classList.add('hidden');
	modal.classList.add('hidden');
}

/*
Draw rotating tank animation
 */
function drawRotations(img,x,y,width,height,angle) {

  let rad = angle;

  //Set the origin to the center of the image
  context.translate(x + width / 2, y + height / 2);

  //Rotate the canvas around the origin
  context.rotate(rad);

  //draw the image
  context.drawImage(img,width / 2 * (-1),height / 2 * (-1),width,height);

  //reset the canvas
  context.rotate(rad * ( -1 ) );
  context.translate((x + width / 2) * (-1), (y + height / 2) * (-1));
}

/*
Show player health
 */
function showHealth(player){
  let imgName = 'health';
  imgName += player.health; //append health number to load correct image

  let img = document.getElementById(imgName);
  drawRotations(img, player.x, player.y - 20, player.width, 10, 0);
}

function appendScores(players) {
  let tBody = document.createElement('tbody');

  for(let id in players) {
    let player = players[id];
    let row = document.createElement("tr");
    let playerName = document.createElement("td");
    let playerScore = document.createElement("td");
    playerName.classList.add("scoretd");
    playerScore.classList.add("scoretd");
    let name = document.createTextNode(player.name);
    let score = document.createTextNode(player.score);

    playerName.appendChild(name);
    playerScore.appendChild(score);
    row.appendChild(playerName);
    row.appendChild(playerScore);
    row.style.color = player.color;
    tBody.appendChild(row);
  }

  return tBody;
}

function displayScore(players) {
  let scoreboard = document.getElementById("scoreboard");
  let oldTbody = scoreboard.getElementsByTagName('tbody')[0];
  let newTbody = document.createElement('tbody');
  newTbody.classList.add('score');
  newTbody = appendScores(players);
  scoreboard.replaceChild(newTbody, oldTbody);
}

const controls = {
  up: false,
  down: false,
  left: false,
  right: false,
  shoot: false
};

canvas.addEventListener('keydown', function(event) {
  switch (event.keyCode) {
    case 65: // A
      controls.left = true;
      break;
    case 87: // W
      controls.up = true;
      break;
    case 68: // D
      controls.right = true;
      break;
    case 83: // S
      controls.down = true;
      break;
    case 32: //spacebar
      controls.shoot = true;
      break;
  }
});
canvas.addEventListener('keyup', function(event) {
  switch (event.keyCode) {
    case 65: // A
      controls.left = false;
      break;
    case 87: // W
      controls.up = false;
      break;
    case 68: // D
      controls.right = false;
      break;
    case 83: // S
      controls.down = false;
      break;

    case 32: // Spacebar
      controls.shoot = false;
      break;

  }
});

socket.emit('new player');

setInterval(function() {
  socket.emit('controls', controls);
}, 1000 / 60);

socket.on('state', function(players, projectiles, xMax, yMax) {
  canvas.width = xMax;
  canvas.height = yMax;
  context.fillStyle='#f9f8eb';
  context.fillRect(0, 0, xMax, yMax);

  displayScore(players);

  for (let id in players) {
    let player = players[id];
    if(player.dead == 0) { //player is not dead
      let tank = document.getElementById(player.color);
      drawRotations(tank, player.x, player.y, 40, 40, player.angle);
      showHealth(player);
    }     else{//player's tank was destroyed, display explosion
      var explosion;
      switch(true){ //gross but works
        case (player.dead >= 32):
          explosion = document.getElementById('explosion1');
          break;
        default:
          explosion = explosion = document.getElementById('explosion1');
          break;
      }
      drawRotations(explosion, player.x, player.y, 50, 50, player.angle);
	}
  }

  for(let i = 0; i < projectiles.length; ++i){
    let proj = projectiles[i];
    context.fillStyle= 'black';
    context.fillRect(proj.x, proj.y, 10, 10);
  }

});
