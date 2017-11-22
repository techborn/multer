/* eslint-env mocha */


const temp = require('fs-temp');
const util = require('./_util');
const assert = require('assert');
const rimraf = require('rimraf');
const multer = require('../');
const FormData = require('form-data');
const { promisify } = require('util');

function generateFilename(req, file, cb) {
    cb(null, file.fieldname + file.originalname);
}

describe('Functionality', () => {
    let cleanup = []

    async function makeStandardEnv(cb) {
        let uploadDir = await promisify(temp.mkdir)();
        cleanup.push(uploadDir);

        let storage = multer.diskStorage({
            destination: uploadDir,
            filename: generateFilename
        });

        return {
            upload: multer({ storage }),
            uploadDir,
            form: new FormData()
        };
    }

    after(() => {
        while (cleanup.length) rimraf.sync(cleanup.pop());
    });

    it('should upload the file to the `dest` dir', async () => {
        let env = await makeStandardEnv();

        let parser = env.upload.single('small0');
        env.form.append('small0', util.file('small0.dat'));

        let { err, req } = await util.submitForm(parser, env.form);
        assert.ifError(err);
        assert.ok(req.file.path.startsWith(env.uploadDir));
        assert.equal(util.fileSize(req.file.path), 1803);
    });

    it('should rename the uploaded file', async () => {
        let env = await makeStandardEnv();
        let parser = env.upload.single('small0');
        env.form.append('small0', util.file('small0.dat'));

        let { err, req } = await util.submitForm(parser, env.form);
        assert.ifError(err);
        assert.equal(req.file.filename, 'small0small0.dat');
    });

    it('should ensure all req.files values (single-file per field) point to an array', async () => {
        let env = await makeStandardEnv();

        let parser = env.upload.single('tiny0')
        env.form.append('tiny0', util.file('tiny0.dat'))

        let { err, req } = await util.submitForm(parser, env.form);
        assert.ifError(err);
        assert.equal(req.file.filename, 'tiny0tiny0.dat');
    });

    it('should ensure all req.files values (multi-files per field) point to an array', async () => {
        let env = await makeStandardEnv();

        let parser = env.upload.array('themFiles', 2);
        env.form.append('themFiles', util.file('small0.dat'));
        env.form.append('themFiles', util.file('small1.dat'));

        let { err, req } = await util.submitForm(parser, env.form);
        assert.ifError(err);
        assert.equal(req.files.length, 2);
        assert.equal(req.files[0].filename, 'themFilessmall0.dat');
        assert.equal(req.files[1].filename, 'themFilessmall1.dat');
    });

    it('should rename the destination directory to a different directory', async () => {
        let storage = multer.diskStorage({
            destination: (req, file, cb) => {
                temp.template('testforme-%s').mkdir((err, uploadDir) => {
                    if (err) return cb(err);
                    cleanup.push(uploadDir);
                    cb(null, uploadDir);
                });
            },
            filename: generateFilename
        });

        let form = new FormData();
        let upload = multer({ storage: storage });
        let parser = upload.array('themFiles', 2);

        form.append('themFiles', util.file('small0.dat'));
        form.append('themFiles', util.file('small1.dat'));

        let { err, req } = await util.submitForm(parser, form);
        assert.ifError(err);
        assert.equal(req.files.length, 2);
        assert.ok(req.files[0].path.indexOf('testforme-') >= 0);
        assert.ok(req.files[1].path.indexOf('testforme-') >= 0);
    });
});
