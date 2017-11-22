/* eslint-env mocha */

const Koa = require('koa');
const http = require('http');
const util = require('./_util');
const assert = require('assert');
const Router = require('koa-router');
const concat = require('concat-stream');
const multer = require('../');
const FormData = require('form-data');
const onFinished = require('on-finished');
const { promisify } = require('util');

let port = 34279;


describe('Koa Integration', () => {
    let app, server;

    before(async () => {
        app = new Koa();
        app.silent = true;
        server = http.createServer(app.callback());
        await promisify(server.listen.bind(server))(port);
    });

    after(async () => {
        server.close();
    });

    function submitForm(form, path) {
        return new Promise((resolve, reject) => {
            let req = form.submit(`http://localhost:${port}${path}`);

            req.on('error', (err) => {
                resolve({err, res:null, body:null});
            });
            req.on('response', (res) => {
                res.pipe(concat({ encoding: 'buffer' }, (body) => {
                    onFinished(req, () => { resolve({err:null, res, body}); });
                }));
            });
        });
    }

    it('should work with koa error handling', async () => {
        let upload = multer({ limits: { fileSize: 200 }});
        let router = new Router();
        let form = new FormData();

        let routeCalled = 0;
        let errorCalled = 0;

        form.append('avatar', util.file('large.jpg'));

        router.post('/profile', upload.single('avatar'), (ctx, next) => {
            routeCalled++;
            ctx.status = 200;
            ctx.body = 'SUCCESS';
        });

        router.prefix('/t1');

        app.once('error', (err, ctx) => {
            assert.equal(err.code, 'LIMIT_FILE_SIZE');
            errorCalled++;
        });

        app.use(router.routes());
        app.use(router.allowedMethods());

        let { err, res, body } = await submitForm(form, '/t1/profile');
        assert.ifError(err);
        assert.equal(routeCalled, 0);
        assert.equal(errorCalled, 1);
        assert.equal(body.toString(), 'Internal Server Error');
        assert.equal(res.statusCode, 500);
    });

    it('should work when receiving error from fileFilter', async () => {
        function fileFilter(req, file, cb) {
            cb(new Error('TEST'));
        }

        let upload = multer({ fileFilter });
        let router = new Router();
        let form = new FormData();

        let routeCalled = 0;
        let errorCalled = 0;

        form.append('avatar', util.file('large.jpg'));

        router.post('/profile', upload.single('avatar'), (ctx, next) => {
            routeCalled++;
            ctx.status = 200;
            ctx.body = 'SUCCESS';
        });

        router.prefix('/t2');

        app.once('error', (err, ctx) => {
            assert.equal(err.message, 'TEST');

            errorCalled++;
        });

        app.use(router.routes());
        app.use(router.allowedMethods());

        let { err, res, body } = await submitForm(form, '/t2/profile');
        assert.ifError(err);
        assert.equal(routeCalled, 0);
        assert.equal(errorCalled, 1);
        assert.equal(body.toString(), 'Internal Server Error');
        assert.equal(res.statusCode, 500);
    });
});
