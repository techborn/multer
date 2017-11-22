/* eslint-env mocha */

const path = require('path');
const temp = require('fs-temp');
const util = require('./_util');
const assert = require('assert');
const rimraf = require('rimraf');
const multer = require('../');
const FormData = require('form-data');
const { promisify } = require('util');


describe('Unicode', () => {
    let uploadDir, upload;

    beforeEach(async () => {
        let path = await promisify(temp.mkdir)();

        let storage = multer.diskStorage({
            destination: path,
            filename: (req, file, cb) => {
                cb(null, file.originalname);
            }
        });

        uploadDir = path;
        upload = multer({ storage });
    });

    afterEach(async () => {
        rimraf.sync(uploadDir);
    });

    it('should handle unicode filenames', async () => {
        let form = new FormData();
        let parser = upload.single('small0');
        let filename = '\ud83d\udca9.dat';

        form.append('small0', util.file('small0.dat'), { filename });

        let { err, req } = await util.submitForm(parser, form);
        assert.ifError(err);

        assert.equal(path.basename(req.file.path), filename);
        assert.equal(req.file.originalname, filename);

        assert.equal(req.file.fieldname, 'small0');
        assert.equal(req.file.size, 1803);
        assert.equal(util.fileSize(req.file.path), 1803);
    });
});
