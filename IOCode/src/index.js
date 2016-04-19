var app = require("http").createServer(handler);
var io = require("socket.io")(app);
var fs = require("fs");
var PORT = process.env.PORT || process.env.NODE_PORT || 3000;

app.listen(PORT);

var numCardsInEnemyHand = 0;
var cardsInHand = {};
var board = {};
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
			socket.room = rooms[key[i]];
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

//make the players deck and randomize the deck order
function generateDeck()
{
	console.log("generating deck");
}

//When the player draws a card put the first card from the deck into the hand and then remove that from the deck
function drawCard(player)
{
	player.cardsInHand.push(player.deck[0]);
	player.deck.splice(0,1);
	players[player.id] = player;
}

//When a player plays a card remove it from their hand, put it on the board(not in yet), and activate the effect
function useCard(player, card)
{
	console.log("activating card effect");
	player.cardsInHand.splice(player.cardsInHand.indexOf(card), 1);
	players[player.id] = player;
}

//If the player has an opponent then it returns them, otherwise it returns nothing.
function findOpponent(currPlayer, socket)
{
	console.log("socket room " +socket.room);
	var room = io.sockets.adapter.rooms[socket.room];
	console.log("opponent room "+room);
	
	for(var playerID in io.sockets.adapter.rooms[socket.room].sockets)
	{
		if(playerID && playerID != currPlayer.id)
		{
			console.log("curr player id " + currPlayer.id + " player id " + playerID);
			return players[playerID];
		}
	}
}

io.on("connection", function(socket)
{
	socket.on("init", function(data)
	{
		enterRoom(socket);
		
		console.log("Socket ID " + socket.id);
		
		players[socket.id] = 
		{
			player: data.data,
			id: socket.id,
			cardsInHand: {},
			deck: generateDeck(),
			grave: {},
			isActivePlayer: false
		};
		
		var message = 
		{
			message: "",
			data: players[socket.id],
			id: socket.id
		};
		
		console.log("looking for opponent "+socket);
		var opponent = findOpponent(players[socket.id], socket);
		if(opponent)
		{
			console.log("Randomizing turn player");
			if(Math.random()*2 < 1)
			{
				opponent.isActivePlayer = true;
				players[opponent.id] = opponent;
				io.sockets.connected[opponent.id].emit("startTurn");
			}
			else
			{
				players[socket.id].isActivePlayer = true;
				io.sockets.connected[socket.id].emit("startTurn");
			}
		}
		
		io.sockets.connected[socket.id].emit("connected", message);
	});
	
	socket.on("nextTurn", function(player)
	{
		var message = 
		{
			data: ""
		};
		
		if(players[player.id].isActivePlayer)
		{
			//console.log("nextTurn socket " +socket);
			var opponent = findOpponent(player, socket);
			if(opponent)
			{
				players[player.id].isActivePlayer = false;
				players[opponent.id].isActivePlayer = true;
				io.sockets.connected[opponent.id].emit("startTurn");
				io.sockets.connected[player.id].emit("endTurn");
				return;
			}
			message.data = "You do not have an opponent.";
			io.sockets.connected[player.id].emit("exception", message);
			return;
		}
		
		message.data = "You are not the active turn player, you cannot end your turn.";
		io.sockets.connected[socket.id].emit("exception", message);
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