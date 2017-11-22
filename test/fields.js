/* eslint-env mocha */

const util = require('./_util');
const assert = require('assert');
const stream = require('stream');
const multer = require('../');
const FormData = require('form-data');
const testData = require('testdata-w3c-json-form');


let noop = ()=>{};

describe('Fields', function () {
    let parser;

    before(() => {
        parser = multer().fields([]);
    });

    it('should process multiple fields', async () => {
        let form = new FormData();

        form.append('name', 'Multer');
        form.append('key', 'value');
        form.append('abc', 'xyz');

        let { err, req } = await util.submitForm(parser, form);
        assert.ifError(err);
        assert.deepEqual(req.body, {
            name: 'Multer',
            key: 'value',
            abc: 'xyz'
        });
    });

    it('should process empty fields', async () => {
        let form = new FormData();

        form.append('name', 'Multer');
        form.append('key', '');
        form.append('abc', '');
        form.append('checkboxfull', 'cb1');
        form.append('checkboxfull', 'cb2');
        form.append('checkboxhalfempty', 'cb1');
        form.append('checkboxhalfempty', '');
        form.append('checkboxempty', '');
        form.append('checkboxempty', '');

        let { err, req } = await util.submitForm(parser, form);
        assert.ifError(err);
        assert.deepEqual(req.body, {
            name: 'Multer',
            key: '',
            abc: '',
            checkboxfull: ['cb1', 'cb2'],
            checkboxhalfempty: ['cb1', ''],
            checkboxempty: ['', '']
        });
    });

    it('should not process non-multipart POST request', async () => {
        let req = new stream.PassThrough();

        req.end('name=Multer');
        req.method = 'POST';
        req.headers = {
            'content-type': 'application/x-www-form-urlencoded',
            'content-length': 11
        };

        await parser({ req });
        assert.equal(req.hasOwnProperty('body'), false);
        assert.equal(req.hasOwnProperty('files'), false);
    });

    it('should not process non-multipart GET request', async () => {
        let req = new stream.PassThrough();

        req.end('name=Multer');
        req.method = 'GET';
        req.headers = {
            'content-type': 'application/x-www-form-urlencoded',
            'content-length': 11
        };

        await parser({ req });
        assert.equal(req.hasOwnProperty('body'), false);
        assert.equal(req.hasOwnProperty('files'), false);
    });

    for (let test of testData) {
        it(`should handle ${test.name}`, async () => {
            let form = new FormData();
            for (let field of test.fields) {
                form.append(field.key, field.value);
            }

            let { err, req } = await util.submitForm(parser, form);
            assert.ifError(err);
            assert.deepEqual(req.body, test.expected);
        });
    }

    it('should convert arrays into objects', async () => {
        let form = new FormData();

        form.append('obj[0]', 'a');
        form.append('obj[2]', 'c');
        form.append('obj[x]', 'yz');

        let { err, req } = await util.submitForm(parser, form);
        assert.ifError(err);
        assert.deepEqual(req.body, {
            obj: {
                '0': 'a',
                '2': 'c',
                'x': 'yz'
            }
        });
    });
});
