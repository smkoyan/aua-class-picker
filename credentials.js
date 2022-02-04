const inquirer = require('inquirer');

const questions = [
    {
        type: 'input',
        name: 'username',
        message: 'What\'s your AUA username',
    },
    {
        type: 'password',
        mask: '*',
        name: 'password',
        message: 'Enter your AUA password',
    }
];


exports.read = async function () {
    try {
        return inquirer.prompt(questions);
    } catch (e) {
        if (e.isTtyError) {
            // I will wait until this will happen and ...
            console.log('Prompt couldn\'t be rendered in the current environment');
            process.exit(1);
        }
        console.error(e);
        console.log('Please save error text and contact with developer. Thanks.');
    }
};
