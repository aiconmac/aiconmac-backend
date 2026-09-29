// backend-api/src/config/multerCloudinaryStorage.js
import path from 'node:path';
import { Readable } from 'stream';
import cloudinary from './cloudinary.js';

/**
 * Custom Multer storage engine for Cloudinary v2
 */
class CloudinaryStorage {
  constructor(options) {
    this.options = options;
  }

  _handleFile(req, file, cb) {
    const { folder, resource_type = 'image', format } = this.options;
    
    // Generate public_id
    const timestamp = Date.now();
    const parsed = path.parse(file.originalname);
    const originalName = (resource_type === 'raw' ? parsed.name : file.originalname.split('.')[0]).replace(/\s+/g, '-');
    // raw assets keep no format, so the extension must live in the public_id to survive in the URL
    const extension = resource_type === 'raw' ? parsed.ext.toLowerCase() : '';
    const public_id = `${folder}/${originalName}-${timestamp}${extension}`;

    // Create upload stream
    const uploadOptions = {
      folder: folder,
      public_id: public_id,
      resource_type: resource_type,
    };

    // Add format transformation for images
    if (resource_type === 'image' && format) {
      uploadOptions.format = format;
    }

    const streamUpload = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          return cb(error);
        }
        
        cb(null, {
          path: result.secure_url,
          filename: result.public_id,
          url: result.secure_url,
          public_id: result.public_id,
          resource_type: result.resource_type,
        });
      }
    );

    // Pipe the file stream to Cloudinary
    Readable.from(file.stream).pipe(streamUpload);
  }

  _removeFile(req, file, cb) {
    if (file.public_id) {
      const resourceType = file.resource_type || 'image';
      cloudinary.uploader.destroy(file.public_id, { resource_type: resourceType }, (error) => {
        cb(error);
      });
    } else {
      cb();
    }
  }
}

export default CloudinaryStorage;