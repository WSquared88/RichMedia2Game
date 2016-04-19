var path = require("path");
var express = require("express");
var compression = require("compression");
var favicon = require("serve-favicon");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");

var dbURL = process.env.MONGOLAB_URI || "mongodb://localhost/SpringsOfAlbion";

var db = mongoose.connect(dbURL, function(err)
{
	if(err)
	{
		console.log("Could not connect to database");
		throw err;
	}
});

var router = require("./router.js");
var port = process.env.PORT || process.env.NODE_PORT || 3000;
var app = express();

app.use("/assets", express.static(path.resolve(__dirname + "/../client")));
app.use(compression());
app.use(bodyParser.urlencoded(
{
	extended: true
}));

// parse application/json body requests. These are usually POST requests or requests with a body parameter in AJAX
//Alternatively, this might be a web API request from a mobile app, another server or another application
app.use(bodyParser.json());

//app.set sets one of the express config options
//set up the view (V of MVC) to use jade (not shown in this example but needed for express to work)
//You can use other view engines besides jade
app.set('view engine', 'jade');

//set the views path to the template directory (not shown in this example but needed for express to work)
app.set('views', __dirname + '/views');

//call favicon with the favicon path and tell the app to use it
app.use(favicon(__dirname + '../../client/img/favicon.png'));

//call the cookie parser library and tell express to use it
app.use(cookieParser());

//pass our app to our router object to map the routes
router(app);

//Tell the app to listen on the specified port
var server = app.listen(port, function(err) {
    //if the app fails, throw the err 
    if (err) {
      throw err;
    }
    console.log('Listening on port ' + port);
});

