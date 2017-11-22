/* eslint-env mocha */

const util = require('./_util');
const assert = require('assert');
const multer = require('../');
const FormData = require('form-data');


describe('Reuse Middleware', () => {
    let parser;

    before(async () => {
        parser = multer().array('them-files');
    });

    it('should accept multiple requests', async () => {
        let pending = 8;

        async function submitData(fileCount) {
            let form = new FormData();

            form.append('name', 'Multer');
            form.append('files', '' + fileCount);

            for (let i = 0; i < fileCount; i++) {
                form.append('them-files', util.file('small0.dat'));
            }

            let { err, req } = await util.submitForm(parser, form);
            assert.ifError(err);

            assert.equal(req.body.name, 'Multer');
            assert.equal(req.body.files, '' + fileCount);
            assert.equal(req.files.length, fileCount);

            for (let file of req.files) {
                assert.equal(file.fieldname, 'them-files');
                assert.equal(file.originalname, 'small0.dat');
                assert.equal(file.size, 1803);
                assert.equal(file.buffer.length, 1803);
            }
        }
        
        await submitData(9);
        await submitData(1);
        await submitData(5);
        await submitData(7);
        await submitData(2);
        await submitData(8);
        await submitData(3);
        await submitData(4);
    });
});
