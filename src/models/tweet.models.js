import mongoose from "mongoose";

const tweetSchema = new Schema({
	owner:{
		type: mongoose.Types.ObjectId,
        ref: "User",
        required: true,
	},
	content:{
		type: String,
        required: true,
	}
},{timestamp: true})

export const Tweet = mongoose.model("Tweet", tweetSchema);