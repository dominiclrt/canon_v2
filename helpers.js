var request = require('request');

module.exports = {
/* ;
NOTES: 
Data passed in the following format

In server.js the functions are all imported as request_functions
As result you call the function using request_functions.post_req_tanks(someData) or request_functions.put_req_tanks(someData)


Data structure for tank
const tank = {
    "userID": "fdsfds",
    "userScore": 0,
    "badgeImgURL": "beginnerbadge.something"
} 

Data structure for highscores
const highscores = {
    {
	"topScore": 200,
	"topUser": "Dom"
    }
}
*/
post_req_tanks:  function(userData){
    request(
        { method: 'POST'
        , uri: ''
        , multipart:
          [ { 
            'content-type': 'application/json',
            body: JSON.stringify(userData),
            }
          ]
        }
      , function (error, response, body) {
          if(response.statusCode == 201){
            console.log(body)
          } else {
            console.log('error: '+ response.statusCode)
            console.log(body)
          }
        }
    
      )
    
},

//Updates the tank
put_req_tanks: function (userData, userURL){
    request(
        { method: 'PUT'
        , uri: userURL
        , multipart:
        [ { 'content-type': 'application/json'
            ,  body: JSON.stringify(userData),
            }
        ]
        }
    , function (error, response, body) {
        if(response.statusCode == 200){
            console.log(body)
        } else {
            console.log('error: '+ response.statusCode)
        }
        }
    )
},

 get_req_tanks_id:  function (userURL){
    request(
        { method: 'GET'
        , uri: userURL
        }
    , function (error, response, body) {
        if(response.statusCode == 200){
            return response;
        } else {
            console.log('error: '+ response.statusCode)
        }
        }
    )
},


get_req_highscores: function (){
    request(
        { 
            method: 'GET',
            uri: 'http://tankgame-api.herokuapp.com/api/highscores'
        }
    , function (error, response, body) {
        if(response.statusCode == 200){
            return (body);
        } else {
            console.log('error: '+ response.statusCode)
            return null;
        }
        }
    )
},

put_req_highscores: function(userData){
    request(
        { method: 'PUT'
        , uri: 'http://tankgame-api.herokuapp.com/api/highscores'
        , multipart:
        [ { 'content-type': 'application/json'
            ,  body: JSON.stringify(userData),
            }
        ]
        }
    , function (error, response, body) {
        if(response.statusCode == 200){
            console.log(body);
        } else {
            console.log('error: '+ response.statusCode)
        }
        }
    )
}
}






