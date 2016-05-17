var app = require("http").createServer(handler);
var io = require("socket.io")(app);
var fs = require("fs");
var path = require("path");
var express = require("express");
var PORT = process.env.PORT || process.env.NODE_PORT || 3000;
//for db
var mongoose = require("mongoose");
var session = require("express-session");
var RedisStore = require("connect-redis")(session);
var url = require("url");
var csrf = require("csurf");

app.listen(PORT);

var boards = {};
var rooms = {};
var roomNum = 0;
var players = {};

var redisURL = 
{
	hostname: "localhost",
	port: 6379
};

var redisPASS;

if(process.env.REDISCLOUD_URL)
{
	redisURL = url.parse(process.env.REDISCLOUD_URL);
	redisPASS = redisURL.auth.split(":")[1];
}

var exp = express();
exp.use("/assets", express.static(path.resolve(__dirname + "/../client")));

exp.use(session(
{
	key: "sessionid",
	store: new RedisStore(
	{
		host: redisURL.hostname,
		port: redisURL.port,
		pass: redisPASS
	}),
	secret: "Domo Arigato",
	resave: true,
	saveUninitialized: true,
	cookie: 
	{
		httpOnly: true
	}
}));

exp.disable("x-powered-by");
exp.use(csrf());
exp.use(function(err, req, res, next)
{
	if(err.code !== "EBADCSRFTOKEN")
	{
		return next(err);
	}
	
	return;
});

//for db
var dbURL = process.env.MONGOLAB_URI || "mongodb://localhost/Cards";

var db = mongoose.connect(dbURL, function(err)
{
	if(err)
	{
		console.log("Could not connect to database");
		throw err;
	}
});


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
function enterRoom(player)
{
	console.log("joining a room");
	var key = Object.keys(rooms);
	
	for(var i = 0;i<key.length;i++)
	{
		console.log("looking into room "+rooms[key[i]].name);
		if(Object.keys(rooms[key[i]].players).length < 2)
		{
			console.log("joining existing room " +rooms[key[i]]);
			
			player.socket.join(rooms[key[i]].name);
			player.socket.room = rooms[key[i]].name;
			rooms[key[i]].players[player.id] = player;
			
			var opponent = findOpponent(player, player.socket);
			
			if(opponent)
			{
				var playerStats = 
				{
					numCards: Object.keys(player.cardsInHand).length,
					numDeck: Object.keys(player.deck).length,
					grave: player.grave,
					board: boards[player.socket.room],
					field: player.field
				};
				
				var opponentStats = 
				{
					numCards: Object.keys(opponent.cardsInHand).length,
					numDeck: Object.keys(opponent.deck).length,
					grave: opponent.grave,
					board: boards[player.socket.room],
					field: opponent.field
				};
				
				opponent.socket.emit("playerConnected", playerStats);
				player.socket.emit("playerConnected", opponentStats);
				console.log();
				
				for(var i = 0;i<3;i++)
				{
					drawCard(player);
				}
				
				if(opponent.cardsInHand.length == 0)
				{
					for(var i = 0;i<3;i++)
					{
						drawCard(opponent);
					}
				}
				//console.log("current players ");
				//console.dir(rooms[key[i]].players);
			}
			return;
		}
		console.log("finished looking into room "+rooms[key[i]]);
	}
	
	var roomName = "room"+roomNum;
	
	player.socket.join(roomName);
	player.socket.room = roomName;
	players[player.id] = player;
	
	var room = 
	{
		name: roomName,
		players: []
	};
	
	var board  = new Array(7);
	for(var x = 0; x < 7; x++)
	{
		board[x] = new Array(5);
	}
	console.dir(board);
	boards[roomName] = board;
	
	rooms[roomName] = room;
	rooms[roomName].players[player.id] = player;
	
	roomNum++;
	console.log("joined "+roomName);
	//console.dir(rooms);
}

//make the players deck and randomize the deck order
function generateDeck(id)
{
	//Generate Deck
	for(var i = 0; i<30; i++)
	{
		players[id].deck[i] = 
		{
			name: "Def.No." + i,
			cost: Math.floor(Math.random() * 6),
			width: 150,
			height: 200,
			posX: 0,
			posY: 0,
			hovering: false
		};
		//TODO ^ should be a card from the database
	}
	console.log("New Deck: ");
	//console.log(players[id].deck);
	//randomize deck
	shuffle(id);
}

//shuffle a deck, input is a player
function shuffle(id)
{
	//How many times we shuffle, between 5 and 15
	var repeats = 5 + Math.floor(Math.random() * 11);
	//place in the deck
	var k;
	//temp card holder
	var temp;
	
	//http://stackoverflow.com/questions/5533192/how-to-get-object-length
	console.log("Deck Size: " + Object.keys(players[id].deck).length);
	
	//The actual shuffle
	for(var i = 0; i < repeats; i++)
		//for(var j = 0; j < players[id].deck.keys(a).length; j++) {
		for(var j = 0; j < Object.keys(players[id].deck).length; j++) {
			k = Math.floor(Math.random() * Object.keys(players[id].deck).length);
			temp = players[id].deck[j];			
			players[id].deck[j] = players[id].deck[k];
			players[id].deck[k] = temp;
	}
	
	console.log("Shuffled Deck: ");
	//console.log(players[id].deck);
}

function getNumCardsInDeck(deck)
{
	var key = Object.keys(deck);
	var numCards = 0;
	console.log("Num cards in deck " + key.length);
	
	for(var i = 0;i<key.length;i++)
	{
		console.log("Looping to draw a card " + i);
		if(!(JSON.stringify(deck[i]) === JSON.stringify({})))
		{
			console.log("Card Name: " + deck[i].name);
			numCards++;
		}
	}
	return numCards;
}

function updatePlayer(player)
{
	players[player.id] = player;
	rooms[player.socket.room].players[player.id] = player;
}

//When the player draws a card put the first card from the deck into the hand and then remove that from the deck
function drawCard(player)
{
	console.log("Drawing a card");
	var key = Object.keys(player.deck);
	console.log("Num cards in deck " + key.length);
	
	for(var i = 0;i<key.length;i++)
	{
		console.log("Looping to draw a card " + i);
		if(!(JSON.stringify(player.deck[i]) === JSON.stringify({})))
		{
			console.log("Card Name: " + player.deck[i].name);
			player.cardsInHand.push(player.deck[i]);
			//player.deck.splice(0,1);
			player.deck[i] = {};
			break;
		}
	}
	updatePlayer(player);
	
	var opp = findOpponent(player, player.socket);
	player.socket.emit("updateCards", 
	{
		player: player.cardsInHand,
		opp: Object.keys(opp.cardsInHand).length,
		deck: getNumCardsInDeck(player.deck),
		oppDeck: getNumCardsInDeck(opp.deck)
	});
	
	opp.socket.emit("updateCards", 
	{
		player: opp.cardsInHand,
		opp: Object.keys(player.cardsInHand).length,
		deck: getNumCardsInDeck(opp.deck),
		oppDeck: getNumCardsInDeck(player.deck)
	});
}

//When a player plays a card remove it from their hand, put it on the board(not in yet), and activate the effect
function useCard(player, card, x, y)
{
	console.log("activating card effect on card "+card.name + " " + player.cardsInHand.indexOf(card));
	
	for(var i = 0;i<player.cardsInHand.length;i++)
	{
		if(player.cardsInHand[i].name == card.name)
		{
			boards[player.socket.room][x][y] = card;
			player.field.push({x: x, y: y});
			player.cardsInHand.splice(i, 1);
			
			updatePlayer(player);
			console.dir(player.cardsInHand);
			
			var opp = findOpponent(player, player.socket);
			player.socket.emit("updateCards", 
			{
				player: player.cardsInHand,
				opp: Object.keys(opp.cardsInHand).length,
				deck: getNumCardsInDeck(player.deck),
				oppDeck: getNumCardsInDeck(opp.deck)
			});
			
			player.socket.emit("updateBoard",
			{
				board: boards[player.socket.room],
				field: player.field,
				oppField: opp.field
			});
			
			opp.socket.emit("updateCards", 
			{
				player: opp.cardsInHand,
				opp: Object.keys(player.cardsInHand).length,
				deck: getNumCardsInDeck(opp.deck),
				oppDeck: getNumCardsInDeck(player.deck)
			});
			
			opp.socket.emit("updateBoard",
			{
				board: boards[player.socket.room],
				field: opp.field,
				oppField: player.field
			});
			break;
		}
	}
	
	
}

//If the player has an opponent then it returns them, otherwise it returns nothing.
function findOpponent(currPlayer, socket)
{
	console.log("socket room " +socket.room);
	var room = io.sockets.adapter.rooms[socket.room];
	console.log("opponent room ");
	//console.dir(rooms[socket.room].players);
	var key = Object.keys(rooms[socket.room].players);
	console.log("got the key");
	
	for(var i = 0;i<key.length;i++)
	{
		if(rooms[socket.room].players[key[i]] && rooms[socket.room].players[key[i]].id != currPlayer.id)
		{
			console.log("curr player id " + currPlayer.id + " player id " + rooms[socket.room].players[key[i]].id);
			return rooms[socket.room].players[key[i]];
		}
	}
	
	console.log("No opponent found");
}

io.on("connection", function(socket)
{
	socket.on("init", function(data)
	{
		console.log("Socket ID " + socket.id);
		
		players[socket.id] = 
		{
			time: data.data.time,
			socket: socket,
			id: socket.id,
			cardsInHand: [],
			deck: {},
			grave: {},
			field: [],
			isActivePlayer: false
		};
		generateDeck(socket.id);
		
		enterRoom(players[socket.id]);
		
		console.log("looking for opponent "+socket);
		var opponent = findOpponent(players[socket.id], socket);
		if(opponent)
		{
			console.log("Randomizing turn player");
			if(Math.random()*2 < 1)
			{
				opponent.isActivePlayer = true;
				updatePlayer(opponent);
				opponent.socket.emit("startTurn");
				opponent.socket.emit
			}
			else
			{
				players[socket.id].isActivePlayer = true;
				updatePlayer(players[socket.id]);
				socket.emit("startTurn");
			}
		}
		
		var message = 
		{
			id: socket.id
		};
		
		socket.emit("connected", message);
	});
	
	socket.on("useCard", function(data)
	{
		console.log("start to use a card");
		useCard(players[socket.id], data.card, data.x, data.y);
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
				
				updatePlayer(players[player.id]);
				updatePlayer(players[opponent.id]);
				
				players[opponent.id].socket.emit("startTurn");
				players[player.id].socket.emit("endTurn");
				drawCard(players[opponent.id]);
				return;
			}
			
			message.data = "You do not have an opponent.";
			players[player.id].socket.emit("exception", message);
			return;
		}
		
		message.data = "You are not the active turn player, you cannot end your turn.";
		players[socket.id].socket.emit("exception", message);
	});
	
	socket.on("disconnect", function(data)
	{
		console.log("data " + data);
		console.log("disconnecting socket room " + socket.room + " socket id " + socket.id);
		
		var opponent = findOpponent(players[socket.id], socket);
		if(opponent)
		{
			console.log("telling opponent to disconnect");
			//console.dir(io.sockets.connected);
			opponent.socket.emit("playerDisconnected");
		}
		
		socket.leave(socket.room);
		
		delete rooms[socket.room].players[socket.id];
		delete players[socket.id];
		
		console.log("\nPlayers in room on disconnect " + Object.keys(rooms[socket.room].players).length);
		console.dir(rooms[socket.room].players);
		console.log(socket.room);
		
		if(Object.keys(rooms[socket.room].players).length <= 0)
		{
			delete rooms[socket.room];
			console.log("deleting " + socket.room);
			console.log("rooms " + rooms);
		}
		
		console.log("Done disconnecting");
	});
});

console.log("Listening on port "+PORT);