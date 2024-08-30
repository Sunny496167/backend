import { asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import { User} from '../models/user.models.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponce.js';

const generateAccessAndRefreshTokens = async(userId) => {
	try {
		const user = await User.findById(userId);
		const accessToken = user.generateAccessToken()
		const refreshToken = user.generateRefreshToken()
		
		user.refreshToken = refreshToken
		await user.save({validateBeforeSave: false})
		
		return {accessToken, refreshToken}
		
	} catch (error) {
		throw new ApiError(500, "Something went wrong while generating refresh and access token");
	}
}

const registerUser = asyncHandler( async (req, res) => {
	// get the user details from frontend
	//validation not empty
	//check if the user is already registered: username, email
	//check for images, check for avatar
	//upload them to cloudinary, avatar
	//create user object - create entry in db
	//remove password and refresh token field from response
	//check for user creation
	//return response
	
	const {fullName, email, password, username} = req.body;
	//console.log("email: ", email);
	
	if(
		[email, fullName, username, password].some((field) => field?.trim() === "")
	){
		throw new ApiError(400, 'All fields are required');
	}
	
	const existedUser = await User.findOne({
		$or: [{username}, {email}]
	});
	
	if(existedUser){
        throw new ApiError(409, 'User already exists');
    }
	
	//console.log(req.files);
	
	const avatarLocalPath = req.files?.avatar[0]?.path;
	//const coverImageLocalPath = req.files?.coverImage[0]?.path;
	
	let coverImageLocalPath;
	if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
		coverImageLocalPath = req.files.coverImage[0].path;
	}
	
	if(!avatarLocalPath){
		throw new ApiError(400, 'Avatar is required');
	}
	
	const avatar = await uploadOnCloudinary(avatarLocalPath)
	const coverImage = await uploadOnCloudinary(coverImageLocalPath)
	
	if(!avatar){
		throw new ApiError(400, 'Avatar is required');
	}
	
	const user = await User.create({
		fullName,
		avatar: avatar.url,
		coverImage: coverImage?.url || "",
		username: username.toLowerCase(),
        email,
        password,
	})
	
	const createdUser = await User.findById(user._id).select(
		"-password -refreshToken"
	)
	
	if(!createdUser){
		throw new ApiError(500, 'Something went wrong while registering the user');
	}
	
	return res.status(201).json(
		new ApiResponse(200, createdUser, 'User registered successfully')
	)
	
})

const loginUser = asyncHandler( async (req, res) => {
	// get the user details from frontend
    // check if the user exists: username, email
    // check if user exists
    // check if password is correct
    // generate access token and refresh token save it in db
    // send cookie
	
	const {email, username, password} = req.body
	
	if(!email && !username){
		throw new ApiError(400, 'Email or username are required')
	}
	
	// if(!email || !username){
	// 	throw new ApiError(400, 'Email or username are required')
	// }
    const user = await User.findOne({
		$or: [{username}, {email}]
	})
	
	if(!user)
		throw new ApiError(404, 'User not found')
    
	const isPasswordValid = await user.isPasswordCorrect(password)
	
	if(!isPasswordValid)
		throw new ApiError(401, 'Password is incorrect')
	
	const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)
	
	const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
	
	const options = {
		httpOnaly: true,
		secure: true
	}
	
	return res
	.status(200)
	.cookie("accessToken", accessToken, options)
	.cookie("refreshToken", refreshToken, options)
	.json(
		new ApiResponse(
			200,
			//TODO:some changes want to do
			{
				user: loggedInUser,accessToken,refreshToken
			},
			'User logged in successfully'
		)
	)
})

const logoutUser = asyncHandler( async(req, res) => {
	// remove refresh token from db and cookie
	await User.findByIdAndUpdate(
		req.user._id,
        {
			refreshToken: undefined
		},
        {
			new: true
		}
	)
	
	const options = {
		httpOnly: true,
        secure: true
	}
	
	return res
	.status(200)
	.clearCookie("accessToken", options)
	.clearCookie("refreshToken", options)
	.json(new ApiResponse(200, {}, "User logged out"))
})

export {
	registerUser,
	loginUser,
	logoutUser
}