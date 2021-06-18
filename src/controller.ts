import express from 'express';
import * as context from 'express-http-context';

import { logger } from './helpers/logger';
import { Runner } from './helpers/runner';

class Controller {
    private static instance: Controller;

    static getInstance() {
        if (!Controller.instance) {
            Controller.instance = new Controller();
        }

        return Controller.instance;
    }

    async index(req: express.Request, res: express.Response) {
        try {
            // TODO
            // Handel & Validate request
            const requestId = context.get('request_id');
            res.status(201)
                .send({
                    requestId,
                    message: 'Request handled successfully.'
                });

            // Start runner
            const data = { ...req.body, batch_file: req.file?.path };
            const runner = new Runner(data, requestId);
            await runner.start();
        } catch (err) {
            logger.error(err);
        }
    }
}

export default Controller.getInstance();
