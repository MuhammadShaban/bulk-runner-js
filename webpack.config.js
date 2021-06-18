const { DefinePlugin } = require('webpack');
const { resolve } = require('path');

module.exports = {
    entry: {
        app: './src/app.ts'
    },
    mode: 'production',
    target: 'node',
    node: false,
    // devtool: 'source-map',
    // optimization: {
    //     minimize: false
    // },
    externals: {},
    output: {
        filename: '[name].js',
        publicPath: '/',
        path: resolve(__dirname, 'build'),
        libraryTarget: "commonjs2"
    },
    resolve: {
        symlinks: false,
        extensions: ['.tsx', '.ts', '.js', '.json']
    },
    module: {
        rules: [
            {
                test: /\.ts?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            },
            {
                test: /\.json?$/,
                use: 'json-loader',
                exclude: /node_modules/
            },
            {
                test: /\.node$/,
                loader: 'node-loader',
                exclude: /node_modules/,
                options: {
                    name: '[name].[ext]',
                }
            },
            { test: /\.html$/, use: 'raw-loader' }
        ],
    },
    plugins: [
        new DefinePlugin({
            '__PROCESS__': {
                'ENV': 'production',
            }
        })
    ],
};