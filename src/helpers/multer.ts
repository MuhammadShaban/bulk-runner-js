import multer from 'multer';
import * as mime from 'mime-types';
import * as context from 'express-http-context';
import config from './config';

export const Multer = (): multer.Multer => {
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, config.uploadPath);
        },
        filename: (req, file, cb) => {
            let id = context.get('request_id');
            let ext = mime.extension(file.mimetype);
            cb(null, `${id}.${ext}`);
        }
    });

    const upload: multer.Multer = multer({ storage });

    return upload;
}
