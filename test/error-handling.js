/* eslint-env mocha */


const util = require('./_util');
const assert = require('assert');
const stream = require('stream');
const multer = require('../');
const FormData = require('form-data');
const { promisify } = require('util');

function withLimits(limits, fields) {
    let storage = multer.memoryStorage();
    return multer({ storage, limits }).fields(fields);
}

describe('Error Handling', () => {
    it('should respect parts limit', async () => {
        let form = new FormData();
        let parser = withLimits({ parts: 1 }, [
            { name: 'small0', maxCount: 1 }
        ]);

        form.append('field0', 'BOOM!');
        form.append('small0', util.file('small0.dat'));

        let {req,err} = await util.submitForm(parser, form);
        assert.equal(err.code, 'LIMIT_PART_COUNT');
    });

    it('should respect file size limit', async () => {
        let form = new FormData();
        let parser = withLimits({ fileSize: 1500 }, [
            { name: 'tiny0', maxCount: 1 },
            { name: 'small0', maxCount: 1 }
        ]);

        form.append('tiny0', util.file('tiny0.dat'));
        form.append('small0', util.file('small0.dat'));

        let {req,err} = await util.submitForm(parser, form);
        assert.equal(err.code, 'LIMIT_FILE_SIZE');
        assert.equal(err.field, 'small0');
    });

    it('should respect file count limit', async () => {
        let form = new FormData();
        let parser = withLimits({ files: 1 }, [
            { name: 'small0', maxCount: 1 },
            { name: 'small1', maxCount: 1 }
        ]);

        form.append('small0', util.file('small0.dat'));
        form.append('small1', util.file('small1.dat'));

        let {err,res} = await util.submitForm(parser, form);
        assert.equal(err.code, 'LIMIT_FILE_COUNT');
    });

    it('should respect file key limit', async () => {
        let form = new FormData();
        let parser = withLimits({ fieldNameSize: 4 }, [
            { name: 'small0', maxCount: 1 }
        ]);

        form.append('small0', util.file('small0.dat'));

        let {req,err} = await util.submitForm(parser, form);
        assert.equal(err.code, 'LIMIT_FIELD_KEY');
    });

    it('should respect field key limit', async () => {
        let form = new FormData();
        let parser = withLimits({ fieldNameSize: 4 }, []);

        form.append('ok', 'SMILE');
        form.append('blowup', 'BOOM!');

        let {req,err} = await util.submitForm(parser, form);
        assert.equal(err.code, 'LIMIT_FIELD_KEY');
    });

    it('should respect field value limit', async () => {
        let form = new FormData();
        let parser = withLimits({ fieldSize: 16 }, []);

        form.append('field0', 'This is okay');
        form.append('field1', 'This will make the parser explode');

        let {req,err} = await util.submitForm(parser, form);
        assert.equal(err.code, 'LIMIT_FIELD_VALUE');
        assert.equal(err.field, 'field1');
    });

    it('should respect field count limit', async () => {
        let form = new FormData();
        let parser = withLimits({ fields: 1 }, []);

        form.append('field0', 'BOOM!');
        form.append('field1', 'BOOM!');

        let {req,err} = await util.submitForm(parser, form);
        assert.equal(err.code, 'LIMIT_FIELD_COUNT');
    });

    it('should respect fields given', async () => {
        let form = new FormData();
        let parser = withLimits(undefined, [
            { name: 'wrongname', maxCount: 1 }
        ]);

        form.append('small0', util.file('small0.dat'));

        let {req,err} = await util.submitForm(parser, form);
        assert.equal(err.code, 'LIMIT_UNEXPECTED_FILE');
        assert.equal(err.field, 'small0');
    });

    it('should report errors from storage engines', async () => {
        let storage = multer.memoryStorage();

        storage._removeFile = function _removeFile(req, file, cb) {
            let err = new Error('Test error');
            err.code = 'TEST';
            cb(err);
        };

        let form = new FormData();
        let upload = multer({ storage: storage });
        let parser = upload.single('tiny0');

        form.append('tiny0', util.file('tiny0.dat'));
        form.append('small0', util.file('small0.dat'));

        let {req,err} = await util.submitForm(parser, form);
        assert.equal(err.code, 'LIMIT_UNEXPECTED_FILE');
        assert.equal(err.field, 'small0');

        assert.equal(err.storageErrors.length, 1);
        assert.equal(err.storageErrors[0].code, 'TEST');
        assert.equal(err.storageErrors[0].field, 'tiny0');
        assert.equal(err.storageErrors[0].file, req.file);
    });

    it('should report errors from busboy constructor', async () => {
        let req = new stream.PassThrough();
        let storage = multer.memoryStorage();
        let upload = multer({ storage }).single('tiny0');
        let body = 'test';

        req.headers = {
            'content-type': 'multipart/form-data',
            'content-length': body.length
        };

        req.end(body);

        try {
            await upload({ req }, () => { });
        } catch (e) {
            assert.equal(e.message, 'Multipart: Boundary not found');
        }
    });

    it('should report errors from busboy parsing', async () => {
        let req = new stream.PassThrough();
        let storage = multer.memoryStorage();
        let upload = multer({ storage }).single('tiny0');
        let boundary = 'AaB03x';
        let body = `--${boundary}\r\n`+
            `Content-Disposition: form-data; name="tiny0"; filename="test.txt"\r\n` +
            `Content-Type: text/plain\r\n` +
            `\r\n` +
            `test without end boundary`;

        req.headers = {
            'content-type': `multipart/form-data; boundary=${boundary}`,
            'content-length': body.length
        };

        req.end(body);
        try {
            await upload({ req }, () => { });
        } catch (e) {
            assert.equal(e.message, 'Unexpected end of multipart data');
        }
    });
});
