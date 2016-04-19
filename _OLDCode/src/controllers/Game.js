var models = require("../models");
//var Account = models.Account;
var gamePage = function(req, res)
{
	res.render("game");
};

module.exports.gamePage = gamePage;
//module.exports.game = game;