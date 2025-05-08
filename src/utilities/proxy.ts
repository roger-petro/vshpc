import { getSettings } from '../settings';
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const morgan = require('morgan');

export function expressServer(port: string) {
    const config = getSettings();
    // Creating express server
    const app = express();
    app.use(cors());
    //const PORT = 3123;
    const HOST = 'localhost';

    app.use(morgan('dev'));

    app.use(
        '/api',
        createProxyMiddleware({
            target: config.customConfig.settings.elasticSearchAPI,
            changeOrigin: true,
            pathRewrite: {
                [`^/api`]: '',
            },
        }),
    );
    app.use(
        '/slurm',
        createProxyMiddleware({
            target: config.customConfig.settings.graphanaAPI,
            changeOrigin: true,
            secure: false,
        }),
    );

    try {
        console.log('Tentando abrir na porta ' + port);
        app.listen({ host: HOST, port: port }, () => {
            console.log(`Starting Proxy at ${HOST}:${port}`);
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.log('Porta do proxy em uso? ');
        console.log(msg);
    }
    return app;
}

//expressServer('http://<hostname>:9200/slurm/_search',3125);
