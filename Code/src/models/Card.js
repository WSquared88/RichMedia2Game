var mongoose = require("mongoose");
var _ = require("underscore");
var CardModel;
var setName = function(name)
{
	return _.escape(name).trim();
};

var CardSchema = new mongoose.Schema(
{
	name: 
	{
		type: String,
		required: true,
		trim: true,
		set: setName
	},
	
	age: 
	{
		type: Number,
		min: 0,
		required: true
	},
	
	color:
	{
		type: String,
		required: false,
		trim: false,
	},
	
	owner:
	{
		type: mongoose.Schema.ObjectId,
		required: true,
		ref: "Account"
	},
	
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