import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({ 
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
	api_key: process.env.COLUDINARY_API_KEY, 
	api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
	try {
		if(!localFilePath) return null;
		//upload the file on the cloudinary
		const response = await cloudinary.uploader.upload((localFilePath),{
			resource_type: "auto"
		})
		//file has been uploaded successfully
		//console.log("file has been uploaded successfully", response.url)
		fs.unlinkSync(localFilePath)
		return response;
	} catch (error) {
		fs.unlinkSync(localFilePath) //remove the locally saved temporary file as the upload operation got failed
		return null;
	}
}

const deleteFromCloudinary = async (userId) => {
	try {
	  if (!userId) return null;
  
	  // Delete the file from Cloudinary
	  const response = await cloudinary.uploader.destroy(userId);
  
	  if (response.result !== 'ok') {
		// Handle case when deletion was not successful
		console.error('Failed to delete image from Cloudinary');
		return null;
	  }
  
	  // Deletion was successful
	  console.log('Image deleted successfully from Cloudinary', response);
	  return response;
	} catch (error) {
	  // Log the error
	  console.error('Error deleting image from Cloudinary:', error.message);
	  return null;
	}
  };
  

export {uploadOnCloudinary,
	deleteFromCloudinary};