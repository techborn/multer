/* eslint-env mocha */

const assert = require('assert')

const util = require('./_util')
const multer = require('../')
const FormData = require('form-data')

describe('Expected files', () => {
    let upload;

    before(() => {
        upload = multer();
    });

    it('should reject single unexpected file', async () => {
        let form = new FormData();
        let parser = upload.single('butme');

        form.append('notme', util.file('small0.dat'));

        let {err,req} = await util.submitForm(parser, form);
        assert.equal(err.code, 'LIMIT_UNEXPECTED_FILE');
        assert.equal(err.field, 'notme');
    });

    it('should reject array of multiple files', async () => {
        let form = new FormData();
        let parser = upload.array('butme', 4);

        form.append('notme', util.file('small0.dat'));
        form.append('notme', util.file('small1.dat'));

        let {err,req} = await util.submitForm(parser, form);
        assert.equal(err.code, 'LIMIT_UNEXPECTED_FILE');
        assert.equal(err.field, 'notme');
    });

    it('should reject overflowing arrays', async () => {
        let form = new FormData();
        let parser = upload.array('butme', 1);

        form.append('butme', util.file('small0.dat'));
        form.append('butme', util.file('small1.dat'));

        let {err,req} = await util.submitForm(parser, form);
        assert.equal(err.code, 'LIMIT_UNEXPECTED_FILE');
        assert.equal(err.field, 'butme');
    });

    it('should accept files with expected fieldname', async () => {
        let form = new FormData();
        let parser = upload.fields([
            { name: 'butme', maxCount: 2 },
            { name: 'andme', maxCount: 2 }
        ]);

        form.append('butme', util.file('small0.dat'));
        form.append('butme', util.file('small1.dat'));
        form.append('andme', util.file('empty.dat'));

        let {err,req} = await util.submitForm(parser, form);
        assert.ifError(err);
        assert.equal(req.files['butme'].length, 2);
        assert.equal(req.files['andme'].length, 1);
    });

    it('should reject files with unexpected fieldname', async () => {
        let form = new FormData();
        let parser = upload.fields([
            { name: 'butme', maxCount: 2 },
            { name: 'andme', maxCount: 2 }
        ]);

        form.append('butme', util.file('small0.dat'));
        form.append('butme', util.file('small1.dat'));
        form.append('andme', util.file('empty.dat'));
        form.append('notme', util.file('empty.dat'));

        let {err,req} = await util.submitForm(parser, form);
        assert.equal(err.code, 'LIMIT_UNEXPECTED_FILE');
        assert.equal(err.field, 'notme');
    });

    it('should allow any file to come thru', async () => {
        let form = new FormData();
        let parser = upload.any();

        form.append('butme', util.file('small0.dat'));
        form.append('butme', util.file('small1.dat'));
        form.append('andme', util.file('empty.dat'));

        let {err,req} = await util.submitForm(parser, form);
        assert.ifError(err)
        assert.equal(req.files.length, 3)
        assert.equal(req.files[0].fieldname, 'butme');
        assert.equal(req.files[1].fieldname, 'butme');
        assert.equal(req.files[2].fieldname, 'andme');
    });
});
