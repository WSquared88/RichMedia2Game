var controllers = require("./controllers");
var router = function(app)
{
	app.get("/game", controllers.Game.gamePage);
	//app.post("/game", controllers.Game.game);
	app.get("/", controllers.Game.gamePage);
};

module.exports = router;