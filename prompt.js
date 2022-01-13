const prompt = require('prompt');
const colors = require('colors/safe');
const auaMessage = require('./auaMessage')

prompt.message = auaMessage.create('AUA');
prompt.delimiter = ': ';

const _get = prompt.get;
prompt.get = function (properties) {
    return new Promise((resolve, reject) => {
        _get(properties, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
};

prompt.start();




module.exports = prompt;
