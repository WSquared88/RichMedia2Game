var mongoose = require("mongoose");
var _ = require("underscore");
var CardModel;
var setName = function(name)
{
	return _.escape(name).trim();
};

var CardSchema = new mongoose.Schema(
{
	//The name of the card
	name: 
	{
		type: String,
		required: true,
		trim: true,
		set: setName
	},
	//Flavor text
	flavor:
	{
		type: String,
		required: true,
		trim: true
	},
	//This is where the card effect javascript is stored, breaking a normal rule of databases of not storing code
	effect:
	{
	},
	//Damage it deals
	attack:
	{
		type: Number,
		min: 0,
		required: true
	},
	//Damage it can withstand
	health:
	{
		type: Number,
		min: 0,
		required: true
	},
	//Card art
	image:
	{
		type: String,
		required: true,
		trim: true
	},
	//The player who used this card
	owner:
	{
		type: mongoose.Schema.ObjectId,
		required: true,
		ref: "Account"
	},
	//When this card was initialized
	createdData:
	{
		type: Date,
		default: Date.now
	}
});

CardSchema.methods.toAPI = function()
{
	return {
		name: this.name,
		age: this.age,
		color: this.color
	};
};

CardSchema.statics.findByOwner = function(ownerId, callback)
{
	var search = 
	{
		owner: mongoose.Types.ObjectId(ownerId)
	};
	
	return CardModel.find(search).select("name age color").exec(callback);
};

CardSchema.statics.findAll = function(ownerId, callback)
{	
	return CardModel.find().select("name age color").exec(callback);
};

CardModel = mongoose.model("Card", CardSchema);

module.exports.CardModel = CardModel;
module.exports.CardSchema = CardSchema;