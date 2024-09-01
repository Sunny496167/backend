import mongoose from "mongoose";

const likeSchema = new Schema({
	comment:{
		type: Schema.Types.ObjectId, // comment id
        ref: "Comment"
	},
	video:{
		type: Schema.Types.ObjectId, // video id
        ref: "Video"
	},
	likedBy:{
		type: Schema.Types.ObjectId, // user id
        ref: "User"
	},
	tweet:{
		type: Schema.Types.ObjectId, // tweet id
        ref: "Tweet"
	}
},{timestamp: true});

export const Like = mongoose.model('Like', likeSchema)