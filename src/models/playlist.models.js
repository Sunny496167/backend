import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const playlistSchema = new Schema({
	name:{
		type: String,
        required: true,
	},
	description:{
		type: String,
        required: true,
	},
	owner:{
		type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
	},
	videos:[
		{
            type: Schema.Types.ObjectId,
            ref: "Video",
            required: true,
        }
    ]
	
},{timestamp: true})

export const Playlist = mongoose.model("Playlist", playlistSchema)