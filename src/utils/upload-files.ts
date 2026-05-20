import minIOClient from "./minio-client.js"

//public available 
export const uploadFileToBucket = async (bucket:string, filename:string, filepath:string) =>{
  try {
    const exists = await minIOClient.bucketExists(bucket)
    if (!exists) {
      await minIOClient.makeBucket(bucket, 'ap-south-1');
    }

    await minIOClient.fPutObject(bucket, filename, filepath);

    const fileurl = await minIOClient.presignedGetObject(bucket, filename);

    return fileurl

  } catch (error) {
    throw new Error("Error")
  }
}
