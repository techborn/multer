/* eslint-env mocha */

const temp = require('fs-temp');
const util = require('./_util');
const assert = require('assert');
const rimraf = require('rimraf');
const multer = require('../');
const FormData = require('form-data');
const { promisify } = require('util');

describe('Issue #232', () => {
    let uploadDir, upload;

    before(async () => {
        let path = await promisify(temp.mkdir)();
        uploadDir = path;
        upload = multer({ dest: path, limits: { fileSize: 100 } });
    });

    after(() => {
        rimraf.sync(uploadDir);
    });

    it('should report limit errors', async () => {
        let form = new FormData();
        let parser = upload.single('file');

        form.append('file', util.file('large.jpg'));

        let { err, req } = await util.submitForm(parser, form);
        assert.ok(err, 'an error was given');
        assert.equal(err.code, 'LIMIT_FILE_SIZE');
        assert.equal(err.field, 'file');
    });
});
