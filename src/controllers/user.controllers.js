import { asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import { User} from '../models/user.models.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponce.js';
import jwt from 'jsonwebtoken'




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

const logoutUser = asyncHandler( async (req, res) => {
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

const refreshAccessToken = asyncHandler(async(req, res) => {
	const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
	
	if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthenticated request");
    }
	
	try {
		const decodedToken = jwt.verify(
			incomingRefreshToken,
			process.env.REFRESH_TOKEN_SECRET
		)
		
		const user = await User.findById(decodedToken?._id)
		
	    if (!user) {
	        throw new ApiError(401, "Invalid refresh token");
	    }
		
		if(incomingRefreshToken !== user?.refreshToken) {
			throw new ApiError(401, "Refresh token is expired or used");
		}
		
		const options = {
			httpOnly: true,
	        secure: true
		}
		
		const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
		
		return res
		.status(200)
		.cookie('accessToken', accessToken, options)
		.cookie('refreshToken', newRefreshToken, options)
		.json(
			new ApiResponse(
	            200,
	            {
					user,
	                accessToken,
	                refreshToken: newRefreshToken
	            },
	            'User access token refreshed successfully'
	        )
		)
	} catch (error) {
		throw new ApiError(401, error?.message || "Invalid refresh token")
	}
})

const changeCurrentPassword = asyncHandler( async(req,res)  => {
	const {oldPassword, newPassword} = req.body
	
	const user = await User.findById(req.user?._id)
	const isPasswordCorrect = await User.isPasswordCorrect(oldPassword)
	
	if(!isPasswordCorrect) {
        throw new ApiError(401, "Old password is incorrect");
    }
	
	user.password = newPassword
	await user.save({validateBeforeSave: false})
	
	return res
	.status(200)
	.json(
		new ApiResponse(
			200,
            {},
            'Password changed successfully'
		)
	)
})

const getCurrentUser = asyncHandler( async(req, res) => {
	return res
	.status(200)
	.json(
		new ApiResponse(
			200,
			req.user,
			'User fetched successfully'
		)
	)
})

const updateAccountDetails = asyncHandler( async(req, res) => {
	const {fullName, email} = req.body
	
	if(!email || !fullName) {
		throw new ApiError(400, 'Email and full name are required')
	}
	
	const user = await User.findByIdAndUpdate(
		req.user?._id,
		{
			$set: {
				fullName,
                email,
			}
		},
		{
			new: true,
		}
	).select("-password")
	
	return res
	.status(200)
	.json(
		new ApiResponse(
			200,
			user,
            'User account details updated successfully'
		)
	)
})

const updateUserAvatar = asyncHandler( async(req, rea) => {
	const avatarLocalPath = req.file?.path
	
    if(!avatarLocalPath) {
        throw new ApiError(400, 'Avatar is required')
    }
	
	//TODO:delete the old image
	
	
	const avatar = await uploadOnCloudinary(avatarLocalPath)
	
	if(!avatar.url) {
		throw new ApiError(400, 'Failed to upload avatar')
	}
	
	const user = await User.findByIdAndUpdate(
		req.user?._id,
        {
            $set: {
                avatar: avatar.url,
            }
        },
        {
            new: true,
        }
	).select("-password")
	
	return res
	.status(200)
	.json(
        new ApiResponse(
            200,
            user,
            'User avatar updated successfully'
		)
	)
})

const updateUserCoverImage = asyncHandler( async(req, res) => {
	const coverImageLocalPath = req.file?.path
	
	if(!coverImageLocalPath){
		throw new ApiError(400, 'Cover image is required')
	}
	
	const coverImage = await uploadOnCloudinary(coverImageLocalPath)
	
	if(!coverImage.url) {
        throw new ApiError(400, 'Failed to upload cover image')
    }
	
	const user = await User.findByIdAndUpdate(
		req.user?._id,
		{
			$set: {
				coverImage: coverImage.url,
			}
		},
		{
			new: true,
		}
	)
	
	return res
	.status(200)
	.json(
        new ApiResponse(
            200,
            user,
            'User cover image updated successfully'
		)
	)
})

export {
	registerUser,
	loginUser,
	logoutUser,
	refreshAccessToken,
	changeCurrentPassword,
	getCurrentUser,
	updateAccountDetails,
	updateUserAvatar,
	updateUserCoverImage,
}