/* eslint-env mocha */

const util = require('./_util');
const assert = require('assert');
const multer = require('../');
const FormData = require('form-data');


function withFilter(fileFilter) {
    return multer({ fileFilter });
}

function skipSpecificFile(req, file, cb) {
    cb(null, file.fieldname !== 'notme');
}

function reportFakeError(req, file, cb) {
    cb(new Error('Fake error'));
}

describe('File Filter', function () {
    it('should skip some files', async () => {
        let form = new FormData();
        let upload = withFilter(skipSpecificFile);
        let parser = upload.fields([
            { name: 'notme', maxCount: 1 },
            { name: 'butme', maxCount: 1 }
        ]);

        form.append('notme', util.file('tiny0.dat'));
        form.append('butme', util.file('tiny1.dat'));

        let { err, req } = await util.submitForm(parser, form);
        assert.ifError(err);
        assert.equal(req.files['notme'], undefined);
        assert.equal(req.files['butme'][0].fieldname, 'butme');
        assert.equal(req.files['butme'][0].originalname, 'tiny1.dat');
        assert.equal(req.files['butme'][0].size, 7);
        assert.equal(req.files['butme'][0].buffer.length, 7);
    });

    it('should report errors from fileFilter', async () => {
        let form = new FormData();
        let upload = withFilter(reportFakeError);
        let parser = upload.single('test');

        form.append('test', util.file('tiny0.dat'));

        let { err, req } = await util.submitForm(parser, form);
        assert.equal(err.message, 'Fake error');
    });
});
