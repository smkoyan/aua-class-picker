const axios = require('axios');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const credentials = require('./credentials');
const figlet = require('figlet');
const gradient = require('gradient-string');
const { createSpinner } = require("nanospinner");
const inquirer = require('inquirer');
const fuzzy = require('fuzzy');
const endpoints = require('./endpoints');


// TODO: move to some config function or init function dedicated to inquirer or just wrap inquirer in a module
inquirer.registerPrompt('checkbox-plus', require('inquirer-checkbox-plus-prompt'));


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
        return;
    }

    if (! (loginResult && loginResult.success)) {
        loginSpinner.error({text: `Invalid Credentials`})
        return;
    }

    loginSpinner.success({text: `Successfully Logged In`});

    return user;
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




// intentionally used function constructor instead of class
// TODO: move to its dedicated module
// TODO: reimplement using class syntax
function User(username, password) {
    this._axios = axios.create({
        baseURL: 'https://im.aua.am',
        // timeout: 1000,
        // headers: {'X-Custom-Header': 'foobar'}
    });
    this._username = username;
    this._password = password;

    // instance.defaults.headers.common['Authorization'] = AUTH_TOKEN;
}

User.prototype.login = async function () {
    const response = await this._axios.post(endpoints.login, {
        UserName: this._username,
        Password: this._password,
        StaySignedIn: true,
    });

    if (response.data.HasError) {
        return {
            success: false,
            message: `can't login`,
            auaMessage: response.data.Message
        }
    }

    const cookies = response.headers["set-cookie"].map(cookie => {
        return cookie.split(';').shift()
    }).join('; ');

    this._axios.defaults.headers.common['Cookie'] = cookies;

    return {
        success: true,
        message: 'successfully logged in',
        data: {cookies}
    }
};

User.prototype.register = async function (classId) {
    try {
        const response = await this._axios.post(endpoints.register, {
            courseClassID: classId,
        });

        const { data } = response;

        if (data.HasError || data.HasWarning) {
            return {
                success: false,
                auaMessage: data.Message,
                message: `We are not allowed to register to class with id: '${classId}' now, sorry!`,
                classId,
            }
        }

        return {
            success: true,
            message: `Successfully registered to class with id:'${classId}', thanks!`,
            classId,
        }
    } catch (e) {
        return {
            success: false,
            message: 'Something went wrong, try again later',
            classId,
        }
    }
};

User.prototype.drop = async function (classId) {
    try {
        const response = await this._axios.post(endpoints.drop, {
            classId: classId,
        });

        // not json returned
        if ( response.headers['content-type'].startsWith('text') ) {
            return {
                success: false,
                message: 'Server error, maybe request format modified, please check source code',
            };
        }

        const { data } = response;

        if (data.HasError || data.HasWarning) {
            return {
                success: false,
                auaMessage: data.Message,
                message: `We are not allowed to drop class with id: '${classId}' now, sorry!`,
                classId,
            };
        }


        return {
            success: true,
            message: `Successfully dropped class with id:'${classId}', thanks!`,
            classId,
        };
    } catch (e) {
        return {
            success: false,
            message: 'Something went wrong, try again later',
            classId,
        };
    }

};


// TODO: try fetching available classes if not possible fetch user classes(for demonstration purposes only)
User.prototype.fetchClasses = async function () {
    try {
        let response = await this._axios.get(endpoints.classList, {
            maxRedirects: 0,
        });

        let classes = parseClasses(
            getDocument(response.data)
        );

        if (classes === null) {
            response = await this._axios.get(endpoints.classListTMP, {
                maxRedirects: 0,
            });
            classes = tmpParseClasses(
                getDocument(response.data)
            );
        }

        return {
            success: true,
            data: classes,
        };


        function getDocument(rawHTML) {
            const dom = new JSDOM(rawHTML);
            return dom.window.document;
        }


        function parseClasses(document) {
            const classesTable = document.querySelector('.avClasses');
            const classesRaw = Array.prototype.slice.call(classesTable.querySelectorAll('tr'), 1);

            if (classesRaw.length < 2) {
                return null;
            }

            const classes = classesRaw.map(cls => {
                return {
                    id: cls.getAttribute('classid'),
                    name: cls.getAttribute('desc'),
                }
            });

            return classes;
        }

        function tmpParseClasses(document) {
            const classesTable = document.querySelector('.grid_tbl');
            const classesRaw = Array.prototype.slice.call(classesTable.querySelectorAll('tr'), 1);

            const classes = classesRaw.map(cls => {
                return {
                    id: cls.firstElementChild.value,
                    name: cls.querySelector('a').innerHTML,
                }
            });

            return classes;
        }

        // key by id
        /*const classesById = _classes.reduce((acc, cls) => {
            acc[cls.id] = cls;
            return acc;
        }, {})*/
    } catch (e) {
        console.error(e);
        return {
            success: false,
            message: `Something went wrong with getting classes, please try again later`
        };
    }
};


const tryRegister = (user, classId) => {
    return user.register(classId).then(result => {
        if (! result.success) {
            console.log(`Could not register to class: ${classId}, trying again`);
            return tryRegister(user, classId);
        }

        return true;
    });
}


const run = async () => {
    welcome();

    const {username, password} = await credentials.read();

    const user = await login(username, password);

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

    // await Promise.all(classes.map(cls => tryRegister(user, cls)));
    // console.log('Congratulations')
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


