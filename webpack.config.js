const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: {
        main: [
            './public/scripts/main.js',
            './public/scripts/homeContent.js',
            './public/scripts/socket-handler.js', // Client-facing scripts
        ],
        admin: [
            './public/scripts/contentWorkshop.js',
            './public/scripts/secondToolbar.js', // Admin-specific scripts
        ],
    },
    output: {
        filename: '[name].bundle.js', // e.g., main.bundle.js, admin.bundle.js
        path: path.resolve(__dirname, 'dist'), // Output to /dist
        clean: true, // Clean the /dist directory on every build
    },
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, 'css-loader'],
            },
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                    },
                },
            },
            {
                test: /\.(png|jpg|jpeg|gif|svg)$/i,
                type: 'asset/resource',
                generator: {
                    filename: 'assets/images/[name][hash][ext]',
                },
            },
            {
                test: /\.(woff|woff2|eot|ttf|otf)$/i,
                type: 'asset/resource',
                generator: {
                    filename: 'assets/fonts/[name][hash][ext]',
                },
            },
        ],
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: 'styles.css',
        }),
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: 'public/scripts/Sortable.min.js',
                    to: 'scripts/Sortable.min.js',
                },
                {
                    from: 'public',
                    to: '.',
                    globOptions: {
                        ignore: ['**/index.html', '**/scripts/**'],
                    },
                },
            ],
        }),
    ],
};
