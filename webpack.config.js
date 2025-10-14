/**
 * Webpack Configuration for Production Optimization
 * Handles bundling, minification, and code splitting
 */

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const CompressionPlugin = require('compression-webpack-plugin');

const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
    mode: isProduction ? 'production' : 'development',
    
    entry: {
        main: './src/index.js',
        navigation: './navigation.js',
        errorHandler: './error-handler.js',
        offlineManager: './offline-manager.js',
        formValidator: './form-validator.js',
        navigationManager: './navigation-manager.js',
        buildConfig: './build-config.js',
        cssOptimizer: './css-optimizer.js',
        performanceDashboard: './performance-dashboard.js'
    },
    
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: isProduction ? '[name].[contenthash].js' : '[name].js',
        chunkFilename: isProduction ? '[name].[contenthash].chunk.js' : '[name].chunk.js',
        clean: true,
        publicPath: '/'
    },
    
    optimization: {
        minimize: isProduction,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    compress: {
                        drop_console: isProduction,
                        drop_debugger: isProduction,
                        pure_funcs: isProduction ? ['console.log', 'console.info'] : []
                    },
                    mangle: {
                        safari10: true
                    },
                    format: {
                        comments: false
                    }
                },
                extractComments: false
            }),
            new CssMinimizerPlugin({
                minimizerOptions: {
                    preset: [
                        'default',
                        {
                            discardComments: { removeAll: true },
                            normalizeWhitespace: true,
                            colormin: true,
                            convertValues: true,
                            discardDuplicates: true,
                            discardEmpty: true,
                            mergeRules: true,
                            minifyFontValues: true,
                            minifyGradients: true,
                            minifyParams: true,
                            minifySelectors: true
                        }
                    ]
                }
            })
        ],
        
        splitChunks: {
            chunks: 'all',
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendors',
                    chunks: 'all',
                    priority: 10
                },
                common: {
                    name: 'common',
                    minChunks: 2,
                    chunks: 'all',
                    priority: 5,
                    reuseExistingChunk: true
                },
                utilities: {
                    test: /[\\/](navigation|error-handler|offline-manager|form-validator)\.js$/,
                    name: 'utilities',
                    chunks: 'all',
                    priority: 8
                },
                optimization: {
                    test: /[\\/](build-config|css-optimizer|performance-dashboard)\.js$/,
                    name: 'optimization',
                    chunks: 'all',
                    priority: 7
                }
            }
        },
        
        runtimeChunk: {
            name: 'runtime'
        }
    },
    
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            ['@babel/preset-env', {
                                targets: {
                                    browsers: ['> 1%', 'last 2 versions', 'not ie <= 11']
                                },
                                useBuiltIns: 'usage',
                                corejs: 3
                            }]
                        ],
                        plugins: [
                            '@babel/plugin-syntax-dynamic-import',
                            '@babel/plugin-proposal-class-properties'
                        ]
                    }
                }
            },
            
            {
                test: /\.css$/,
                use: [
                    isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
                    {
                        loader: 'css-loader',
                        options: {
                            importLoaders: 1,
                            sourceMap: !isProduction
                        }
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            postcssOptions: {
                                plugins: [
                                    ['tailwindcss', {}],
                                    ['autoprefixer', {}],
                                    ...(isProduction ? [
                                        ['@fullhuman/postcss-purgecss', {
                                            content: [
                                                './index.html',
                                                './src/**/*.js',
                                                './pnr_input/**/*.html',
                                                './ticket_status_display_*/**/*.html',
                                                './pnr_history_*/**/*.html'
                                            ],
                                            defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || [],
                                            safelist: [
                                                'dark',
                                                /^bg-/,
                                                /^text-/,
                                                /^border-/,
                                                /^hover:/,
                                                /^focus:/,
                                                /^active:/,
                                                /^dark:/,
                                                'animate-spin',
                                                'animate-pulse',
                                                'animate-bounce',
                                                'loading-state',
                                                'error-shake',
                                                'success-bounce',
                                                'fade-in',
                                                'slide-up'
                                            ]
                                        }]
                                    ] : [])
                                ]
                            }
                        }
                    }
                ]
            },
            
            {
                test: /\.(png|jpe?g|gif|svg|webp)$/i,
                type: 'asset',
                parser: {
                    dataUrlCondition: {
                        maxSize: 8 * 1024 // 8KB
                    }
                },
                generator: {
                    filename: 'images/[name].[contenthash][ext]'
                }
            },
            
            {
                test: /\.(woff|woff2|eot|ttf|otf)$/i,
                type: 'asset/resource',
                generator: {
                    filename: 'fonts/[name].[contenthash][ext]'
                }
            },
            
            {
                test: /\.html$/,
                use: {
                    loader: 'html-loader',
                    options: {
                        minimize: isProduction,
                        sources: {
                            list: [
                                {
                                    tag: 'img',
                                    attribute: 'src',
                                    type: 'src'
                                },
                                {
                                    tag: 'link',
                                    attribute: 'href',
                                    type: 'src',
                                    filter: (tag, attribute, attributes) => {
                                        return attributes.rel && attributes.rel.includes('stylesheet');
                                    }
                                }
                            ]
                        }
                    }
                }
            }
        ]
    },
    
    plugins: [
        new HtmlWebpackPlugin({
            template: './index.html',
            filename: 'index.html',
            inject: 'body',
            minify: isProduction ? {
                removeComments: true,
                collapseWhitespace: true,
                removeRedundantAttributes: true,
                useShortDoctype: true,
                removeEmptyAttributes: true,
                removeStyleLinkTypeAttributes: true,
                keepClosingSlash: true,
                minifyJS: true,
                minifyCSS: true,
                minifyURLs: true
            } : false
        }),
        
        ...(isProduction ? [
            new MiniCssExtractPlugin({
                filename: '[name].[contenthash].css',
                chunkFilename: '[name].[contenthash].chunk.css'
            }),
            
            new CompressionPlugin({
                algorithm: 'gzip',
                test: /\.(js|css|html|svg)$/,
                threshold: 8192,
                minRatio: 0.8
            }),
            
            new CompressionPlugin({
                algorithm: 'brotliCompress',
                test: /\.(js|css|html|svg)$/,
                compressionOptions: {
                    level: 11
                },
                threshold: 8192,
                minRatio: 0.8,
                filename: '[path][base].br'
            })
        ] : []),
        
        ...(process.env.ANALYZE ? [
            new BundleAnalyzerPlugin({
                analyzerMode: 'static',
                openAnalyzer: false,
                reportFilename: 'bundle-analysis.html'
            })
        ] : [])
    ],
    
    resolve: {
        extensions: ['.js', '.json'],
        alias: {
            '@': path.resolve(__dirname, 'src'),
            '@components': path.resolve(__dirname, 'src/components'),
            '@utils': path.resolve(__dirname, 'src/utils'),
            '@styles': path.resolve(__dirname, 'src/styles')
        }
    },
    
    devServer: {
        static: {
            directory: path.join(__dirname, 'dist')
        },
        compress: true,
        port: 3000,
        hot: true,
        open: true,
        historyApiFallback: true,
        client: {
            overlay: {
                errors: true,
                warnings: false
            }
        }
    },
    
    performance: {
        hints: isProduction ? 'warning' : false,
        maxEntrypointSize: 250000, // 250KB
        maxAssetSize: 250000, // 250KB
        assetFilter: (assetFilename) => {
            return !assetFilename.endsWith('.map');
        }
    },
    
    stats: {
        colors: true,
        modules: false,
        children: false,
        chunks: false,
        chunkModules: false,
        entrypoints: false,
        excludeAssets: /\.(map|txt|html)$/,
        assetsSort: 'size'
    }
};

// Environment-specific configurations
if (isProduction) {
    module.exports.devtool = 'source-map';
    
    // Add service worker generation
    const WorkboxPlugin = require('workbox-webpack-plugin');
    module.exports.plugins.push(
        new WorkboxPlugin.GenerateSW({
            clientsClaim: true,
            skipWaiting: true,
            runtimeCaching: [
                {
                    urlPattern: /^https:\/\/fonts\.googleapis\.com/,
                    handler: 'StaleWhileRevalidate',
                    options: {
                        cacheName: 'google-fonts-stylesheets'
                    }
                },
                {
                    urlPattern: /^https:\/\/fonts\.gstatic\.com/,
                    handler: 'CacheFirst',
                    options: {
                        cacheName: 'google-fonts-webfonts',
                        expiration: {
                            maxEntries: 30,
                            maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                        }
                    }
                },
                {
                    urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
                    handler: 'CacheFirst',
                    options: {
                        cacheName: 'images',
                        expiration: {
                            maxEntries: 50,
                            maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                        }
                    }
                }
            ]
        })
    );
} else {
    module.exports.devtool = 'eval-source-map';
}