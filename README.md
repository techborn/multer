# kuma-multer

> Multer is a node.js middleware for handling `multipart/form-data` for koa.\
> Alternative [multer] wrapper for koa v2's middleware using the async/await structure.

> Uses Proxy instead of a plain function wrapper.\
> Tests are from [koa-multer][koa-multer], but updated to modern node syntax.

#### Made with Nodejs v8 (untested against v6 --harmony, but might work)

[![NPM version][npm-img]][npm-url]
[![License][license-img]][license-url]


## Install

```sh
$ npm install --save kuma-multer
```

## Usage:

```js
const Koa = require('koa');
const Router = require('koa-router');
const Multer = require('kuma-multer');

const app = new Koa();
const router = new Router();

let upload = Multer({ dest: 'uploads/' });

router.post('/profile', upload.single('avatar'));
router.post('/profile/photos', upload.array('list'));

app.use(router.routes());
app.listen(3000);
```
Files are available via `ctx.req.files` or `ctx.request.files`.
If there is only one file, remove the plurality. (eg. `ctx.req.file`)
Any text fields are available via `ctx.req.body` or `ctx.request.body`.

## License

  [MIT](LICENSE)


[npm-img]: https://img.shields.io/npm/v/kuma-multer.svg?style=flat-square
[npm-url]: https://npmjs.org/package/kuma-multer
[license-img]: https://img.shields.io/badge/license-MIT-green.svg?style=flat-square
[license-url]: LICENSE
[multer]: https://github.com/expressjs/multer
[koa-multer]: https://github.com/koajs/multer
