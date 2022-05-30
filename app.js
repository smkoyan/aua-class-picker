#!/usr/bin/env node
const credentials = require('./credentials');
const figlet = require('figlet');
const gradient = require('gradient-string');
const { createSpinner } = require("nanospinner");
const inquirer = require('inquirer');
const fuzzy = require('fuzzy');
const User = require('./user');


// TODO: move to some config function or init function dedicated to inquirer or just wrap inquirer in a module
inquirer.registerPrompt('checkbox-plus', require('inquirer-checkbox-plus-prompt'));


const errors = {
    login: {
        CONNECTION_PROBLEM: 'CONNECTION_PROBLEM',
        INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    },
};


const welcome = () => {
    const message = `Welcome To ${'aua class picker'.toUpperCase()}`;

    const figletMessage = figlet.textSync(
        message
    );

    const gradientFigletMessage = gradient.summer(
        figletMessage
    );

    console.log(
        gradientFigletMessage
    );
};

const login = async (username, password) => {
    const user = new User(username, password);

    const loginSpinner = createSpinner('Trying To Login...').start();
    await sleep(2000);

    let loginResult = null;

    try {
        loginResult = await user.login();
    } catch (e) {
        loginSpinner.error({text: `Something went wrong, check your connection`})
        return {
            success: false,
            name: errors.login.CONNECTION_PROBLEM,
        };
    }

    if (! (loginResult && loginResult.success)) {
        loginSpinner.error({text: `Invalid Credentials`})
        return {
            success: false,
            name: errors.login.INVALID_CREDENTIALS,
        };
    }

    loginSpinner.success({text: `Successfully Logged In`});

    return {
        success: true,
        data: user,
    };
};


/**
 * Choose preferred classes for registration
 * @param classes {Array<{id: int, name: string}>}
 * @returns {Promise<Array<int>>}
 */
const pickClasses = async (classes) => {
    const questions = [
        {
            type: 'list',
            name: 'classInputType',
            message: 'How would you pick classes',
            choices: [
                {
                    name: 'Choose from list of classes (Recommended)',
                    value: 'list',
                },
                {
                    name: 'Enter raw class ids',
                    value: 'ids',
                },
            ]
        },

        {
            type: 'input',
            name: 'classIds',
            message: 'Enter classes ids separated by spaces (ex. 7878 9651 4456)',
            when: (answers) => {
                return answers.classInputType === 'ids';
            },
        },

        {
            type: 'checkbox-plus',
            name: 'classes',
            message: 'Select classes to register (type to search, <space> to check/uncheck option)',
            pageSize: 10,
            highlight: true,
            searchable: true,
            when: (answers) => {
                console.log({answers})
                return answers.classInputType === 'list';
            },
            //default: ['yellow', 'red'],
            source: function(answersSoFar, input) {
                console.log('trying')
                input = input || '';

                return new Promise(function(resolve) {

                    const fuzzyResult = fuzzy.filter(input, classes, {
                        extract: cls => cls.name,
                    });

                    //console.log(JSON.stringify(fuzzyResult))

                    const data = fuzzyResult.map(function(element) {
                        return {
                            name: element.original.name,
                            value: element.original.id
                        };
                    });

                    resolve(data);

                });

            }
        }
    ];

    /** @type {{classInputType: string, classes: Array<int>}} */
    const answers = await inquirer.prompt(questions);

    return answers.classes;



    // use `checkbox-plus` plugin of `inquirer` package
    // first ask if user wants enter raw ids
    // or choose from classes list
};


const tryRegister = (user, classId) => {
    return user.register(classId).then(result => {
        if (! result.success) {
            console.log(`Could not register to class: ${classId}, trying again`);
            return tryRegister(user, classId);
        }

        return true;
    });
};

const tryLogin = async () => {
    const {username, password} = await credentials.read();

    const loginResult = await login(username, password);

    if (! loginResult.success) {
        if (loginResult.name === errors.login.INVALID_CREDENTIALS) {
            return tryLogin(username, password);
        } else {
            return null;
        }
    }

    return loginResult.data;
};


const run = async () => {
    welcome();

    const user = await tryLogin();

    if (!user) {
        return;
    }

    const fetchClassesResult = await user.fetchClasses();

    if (! fetchClassesResult.success) {
        // cannot fetch classes maybe exit program or let enter raw ids
        // will handle later
        return;
    }
    const availableClasses = fetchClassesResult.data;

    const preferredClasses = await pickClasses(availableClasses);


    // TODO: ask if wanna start registering now and start registration else hang there
    /// ---------------------------------------------------------

    await Promise.all(preferredClasses.map(cls => tryRegister(user, cls)));
    console.log('Congratulations')
};

void run()


const sleep = (ms = 1000) => {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}


// parse username, password and preferable classes from cmd args
const parseCommandLineArguments = () => {
    const cmdArgs = {};

    process.argv.slice(2).map(arg => {
        return arg.split('=');
    }).forEach(arg => {
        // array value
        if ( arg[1].includes('[') ) {
            cmdArgs[arg[0]] = JSON.parse(arg[1]);
        } else {
            cmdArgs[arg[0]] = arg[1]
        }
    });

    return cmdArgs;
}


const parseCredentials = () => {
    const cmdArgs = parseCommandLineArguments()

    console.log(cmdArgs);
};


