var app = require("http").createServer(handler);
var io = require("socket.io")(app);
var fs = require("fs");
var PORT = process.env.PORT || process.env.NODE_PORT || 3000;

app.listen(PORT);

var numCardsInEnemyHand = 0;
var cardsInHand = {};
var board = {};
var squares = {};
var points = {};
var rooms = [];
var roomNum = 0;
var players = {};

function handler(req, res)
{
	fs.readFile(__dirname + "/../client/client.html", function(err, data)
	{
		if(err)
		{
			throw err;
		}
		
		res.writeHead(200);
		res.end(data);
	});
}

function checkCollision(id)
{
	if(Math.abs(squares[id].x + squares[id].width/2 - flag.x) > flag.radius + squares[id].width/2)
	{
		return;
	}
	
	if(Math.abs(squares[id].y + squares[id].height/2 - flag.y) > flag.radius + squares[id].height/2)
	{
		return;
	}
	
	var message = 
	{
		message: "",
		data: points,
		flag: flag
	};
	
	io.sockets.in(socket.room).emit("updatePoints", message);
}

//Done, adds a player to a room with a max of 2 people per room
function enterRoom(socket)
{
	console.log("joining a room");
	var key = Object.keys(rooms);
	
	for(var i = 0;i<key.length;i++)
	{
		console.log("looking into room "+rooms[key[i]]);
		if(io.sockets.adapter.rooms[rooms[key[i]]].length < 2)
		{
			console.log("joining existing room " +rooms[key[i]]);
			socket.join(rooms[key[i]]);
			return;
		}
		console.log("finished looking into room "+rooms[key[i]]);
	}
	
	//Look at this later
	//http://stackoverflow.com/questions/19156636/node-js-and-socket-io-creating-room
	
	var roomName = "room"+roomNum;
	socket.join(roomName);
	rooms.push(roomName);
	socket.room = roomName;
	roomNum++;
	console.log("joined "+roomName);
}

function generateDeck()
{
	console.log("generating deck");
}

io.on("connection", function(socket)
{
	socket.on("init", function(data)
	{
		enterRoom(socket);
		
		console.log("Socket ID " + player.id);
		
		players[player.id] = 
		{
			player: data.data,
			deck: generateDeck(),
			isActivePlayer: false
		}
		
		var message = 
		{
			message: "",
			data: players[socket.id]
		};
		
		io.sockets.connected[socket.id].emit("connected", message);
		//io.sockets.in(socket.room).emit("allSquares", message);
		//io.sockets.in(socket.room).emit("updatePoints", pointMessage);
	});
	
	socket.on("disconnect", function(data)
	{
		console.log("data " + data);
		socket.leave(socket.room);
		
		if(!io.sockets.adapter.rooms[socket.room])
		{
			rooms.splice(rooms.indexOf(socket.room), 1);
			console.log("deleting " + socket.room);
			console.log("rooms " + rooms);
		}
		
		console.log("Done disconnecting");
	});
});

console.log("Listening on port "+PORT);