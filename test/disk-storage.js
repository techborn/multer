/* eslint-env mocha */


const fs = require('fs');
const path = require('path');
const temp = require('fs-temp');
const util = require('./_util')
const assert = require('assert');
const rimraf = require('rimraf');
const multer = require('../');
const FormData = require('form-data');
const { promisify } = require('util');

describe('Disk Storage', () => {
    let uploadDir, upload;

    beforeEach(async () => {
        let dest = await promisify(temp.mkdir)();
        uploadDir = dest;
        upload = multer({ dest });
    });

    afterEach(async () => {
        await promisify(rimraf)(uploadDir);
    });

    it('should process parser/form-data POST request', async () => {
        let form = new FormData();
        let parser = upload.single('small0');

        form.append('name', 'Multer');
        form.append('small0', util.file('small0.dat'));

        let {err,req} = await util.submitForm(parser, form);
        assert.ifError(err);

        assert.equal(req.body.name, 'Multer');

        assert.equal(req.file.fieldname, 'small0');
        assert.equal(req.file.originalname, 'small0.dat');
        assert.equal(req.file.size, 1803);
        assert.equal(util.fileSize(req.file.path), 1803);

    });

    it('should process empty fields and an empty file', async () => {
        let form = new FormData();
        let parser = upload.single('empty');

        form.append('empty', util.file('empty.dat'));
        form.append('name', 'Multer');
        form.append('version', '');
        form.append('year', '');
        form.append('checkboxfull', 'cb1');
        form.append('checkboxfull', 'cb2');
        form.append('checkboxhalfempty', 'cb1');
        form.append('checkboxhalfempty', '');
        form.append('checkboxempty', '');
        form.append('checkboxempty', '');

        let {err,req} = await util.submitForm(parser, form);
        assert.ifError(err);

        assert.equal(req.body.name, 'Multer');
        assert.equal(req.body.version, '');
        assert.equal(req.body.year, '');

        assert.deepEqual(req.body.checkboxfull, ['cb1', 'cb2']);
        assert.deepEqual(req.body.checkboxhalfempty, ['cb1', '']);
        assert.deepEqual(req.body.checkboxempty, ['', '']);

        assert.equal(req.file.fieldname, 'empty');
        assert.equal(req.file.originalname, 'empty.dat');
        assert.equal(req.file.size, 0);
        assert.equal(util.fileSize(req.file.path), 0);

    });

    it('should process multiple files', async () => {
        let form = new FormData();
        let parser = upload.fields([
            { name: 'empty', maxCount: 1 },
            { name: 'tiny0', maxCount: 1 },
            { name: 'tiny1', maxCount: 1 },
            { name: 'small0', maxCount: 1 },
            { name: 'small1', maxCount: 1 },
            { name: 'medium', maxCount: 1 },
            { name: 'large', maxCount: 1 }
        ]);

        form.append('empty', util.file('empty.dat'));
        form.append('tiny0', util.file('tiny0.dat'));
        form.append('tiny1', util.file('tiny1.dat'));
        form.append('small0', util.file('small0.dat'));
        form.append('small1', util.file('small1.dat'));
        form.append('medium', util.file('medium.dat'));
        form.append('large', util.file('large.jpg'));

        let {err,req} = await util.submitForm(parser, form);
        assert.ifError(err);

        assert.deepEqual(req.body, {});

        assert.equal(req.files['empty'][0].fieldname, 'empty');
        assert.equal(req.files['empty'][0].originalname, 'empty.dat');
        assert.equal(req.files['empty'][0].size, 0);
        assert.equal(util.fileSize(req.files['empty'][0].path), 0);

        assert.equal(req.files['tiny0'][0].fieldname, 'tiny0');
        assert.equal(req.files['tiny0'][0].originalname, 'tiny0.dat');
        assert.equal(req.files['tiny0'][0].size, 128);
        assert.equal(util.fileSize(req.files['tiny0'][0].path), 128);

        assert.equal(req.files['tiny1'][0].fieldname, 'tiny1');
        assert.equal(req.files['tiny1'][0].originalname, 'tiny1.dat');
        assert.equal(req.files['tiny1'][0].size, 7);
        assert.equal(util.fileSize(req.files['tiny1'][0].path), 7);

        assert.equal(req.files['small0'][0].fieldname, 'small0');
        assert.equal(req.files['small0'][0].originalname, 'small0.dat');
        assert.equal(req.files['small0'][0].size, 1803);
        assert.equal(util.fileSize(req.files['small0'][0].path), 1803);

        assert.equal(req.files['small1'][0].fieldname, 'small1');
        assert.equal(req.files['small1'][0].originalname, 'small1.dat');
        assert.equal(req.files['small1'][0].size, 329);
        assert.equal(util.fileSize(req.files['small1'][0].path), 329);

        assert.equal(req.files['medium'][0].fieldname, 'medium');
        assert.equal(req.files['medium'][0].originalname, 'medium.dat');
        assert.equal(req.files['medium'][0].size, 13386);
        assert.equal(util.fileSize(req.files['medium'][0].path), 13386);

        assert.equal(req.files['large'][0].fieldname, 'large');
        assert.equal(req.files['large'][0].originalname, 'large.jpg');
        assert.equal(req.files['large'][0].size, 2413677);
        assert.equal(util.fileSize(req.files['large'][0].path), 2413677);

    });

    it('should remove uploaded files on error', async () => {
        let form = new FormData();
        let parser = upload.single('tiny0');

        form.append('tiny0', util.file('tiny0.dat'));
        form.append('small0', util.file('small0.dat'));

        let {err,req} = await util.submitForm(parser, form);
        assert.equal(err.code, 'LIMIT_UNEXPECTED_FILE');
        assert.equal(err.field, 'small0');
        assert.deepEqual(err.storageErrors, []);

        let files = fs.readdirSync(uploadDir);
        assert.deepEqual(files, []);

    });

    it('should report error when directory doesn\'t exist', async () => {
        let directory = path.join(temp.mkdirSync(), 'ghost');

        let storage = multer.diskStorage({ destination: (_,$,cb)=>cb(null,directory) });
        let upload = multer({ storage: storage });
        let parser = upload.single('tiny0');
        let form = new FormData();

        form.append('tiny0', util.file('tiny0.dat'));

        let {err,req} = await util.submitForm(parser, form);
        assert.equal(err.code, 'ENOENT');
        assert.equal(path.dirname(err.path), directory);

    });
});
