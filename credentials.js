const prompt = require('./prompt');
const colors = require('colors/safe');
const auaMessage = require('./auaMessage');

const properties = [
    {
        name: 'username',
        description: auaMessage.create('username'),
    },
    {
        name: 'password',
        description: auaMessage.create('password'),
        hidden: true
    }
];


exports.read = function () {
    return prompt.get(properties);
}
