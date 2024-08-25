// require('dotenv').config({path: './env'})
import dotenv from 'dotenv';
import connectDB from './db/index.js';

dotenv.config({
	path: './.env'
})

connectDB()
.then(() => {
	app.listen(process.env.PORT || 8000, () => {
		console.log('listening on port ' + process.env.PORT)
	})
})
.catch((err) => {
	console.error(`Error connecting to MongoDB: ${err.message}`);
    process.exit(1);
})


/*
import express from 'express'
const app = express()
( async () => {
	try {
		await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
		app.on('error', (error) => {
			console.error("MongoDB connection error:", error);
            throw error
		})
		
		app.listen(process.env.PORT, () => {
			console.log(`Server is running on port ${process.env.PORT}`);
		})
	} catch (error) {
		console.error("ERROR", error);
		throw err
	}
})()
	
*/

