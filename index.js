
const multer = require('multer');
const { promisify } = require('util');

let Multer = multer().constructor;
// permanently apply the proxy wrapper the correct prototype.
let keys = ['any', 'array', 'fields', 'none', 'single'];
for (let key of keys)
    Multer.prototype[key] = new Proxy(Multer.prototype[key], {apply(T, that, args) {
        return async (ctx, next) => {
            await promisify(T.bind(that)(...args))(ctx.req, ctx.res);
            if ('request' in ctx) {
                if (ctx.req.body) ctx.request.body = ctx.req.body;
                if (ctx.req.file) ctx.request.file = ctx.req.file;
                if (ctx.req.files) ctx.request.files = ctx.req.files;
            }
            if (next) return next();
        };
    }});
module.exports = multer;
