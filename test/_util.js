const fs = require('fs')
const path = require('path')
const stream = require('stream')
const onFinished = require('on-finished')
const { promisify } = require('util');

exports.file = (name) => {
    return fs.createReadStream(path.join(__dirname, 'files', name));
}

exports.fileSize = (path) => {
    return fs.statSync(path).size;
}

exports.submitForm = async (multer, form) => {
    let length = await promisify(form.getLength.bind(form))();

    const req = new stream.PassThrough();

    req.complete = false;
    form.once('end', () => {
        req.complete = true;
    });

    form.pipe(req);
    req.headers = {
        'content-type': 'multipart/form-data; boundary=' + form.getBoundary(),
        'content-length': length
    };

    const res = null;
    let err = null;
    try {
        await multer({ req, res });
    } catch (e) {
        err = e;
    }
    await new Promise(resolve=>onFinished(req,resolve));
    return {err,req};
}
