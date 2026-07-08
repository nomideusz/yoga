import { S3Client, PutObjectCommand, DeleteObjectCommand, } from '@aws-sdk/client-s3';
export function createS3Adapter(config) {
    const client = new S3Client({
        endpoint: config.endpoint,
        region: config.region,
        credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
        },
        forcePathStyle: config.forcePathStyle ?? true,
    });
    return {
        async put(key, buffer, contentType) {
            await client.send(new PutObjectCommand({
                Bucket: config.bucket,
                Key: key,
                Body: buffer,
                ContentType: contentType,
                // Keys are unique per upload, so objects never change in place.
                CacheControl: 'public, max-age=31536000, immutable',
            }));
        },
        async delete(key) {
            await client.send(new DeleteObjectCommand({
                Bucket: config.bucket,
                Key: key,
            }));
        },
        getUrl(key) {
            return `${config.publicUrl.replace(/\/$/, '')}/${key}`;
        },
    };
}
