/* eslint-env mocha */

const util = require('./_util');
const multer = require('../');
const assert = require('assert');
const FormData = require('form-data');


describe('File ordering', function () {
    it('should present files in same order as they came', async () => {
        let storage = multer.memoryStorage();
        let upload = multer({ storage });
        let parser = upload.array('themFiles', 2);
        let form = new FormData();

        form.append('themFiles', util.file('small0.dat'));
        form.append('themFiles', util.file('small1.dat'));

        let { err, req } = await util.submitForm(parser, form);
        assert.ifError(err);
        assert.equal(req.files.length, 2);
        assert.equal(req.files[0].originalname, 'small0.dat');
        assert.equal(req.files[1].originalname, 'small1.dat');
    });
});
