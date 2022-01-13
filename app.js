const axios = require('axios');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const credentials = require('./credentials');
const colors = require("colors/safe");
const prompt = require('./prompt');
const auaMessage = require('./auaMessage');

const endpoints = {
    login: 'https://im.aua.am/Account/Login',
    classList: 'https://im.aua.am/Student/ClassRegistration',
    register: 'https://im.aua.am/Student/StudentClassRegister/',
    drop: 'https://im.aua.am/Student/DropClass'
};


// intentionally used function constructor instead of class
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



// TODO: move to user class
const getClasses = async () => {
    try {
        const response = await axios.get(endpoints.classList, {
            //headers: {cookie: cookies},
            maxRedirects: 0
        });


        const dom = new JSDOM(response.data);
        const document = dom.window.document;
        const classesTable = document.querySelector('.avClasses');
        const classes = Array.prototype.slice.call(classesTable.querySelectorAll('tr'), 1);
        const _classes = classes.map(cls => {
            return {
                id: cls.getAttribute('classid'),
                name: cls.getAttribute('desc'),
            }
        });

        /*const classesById = _classes.reduce((acc, cls) => {
            acc[cls.id] = cls;
            return acc;
        }, {})

        console.log(classesById);*/


        // parse class names with ids and return
        // after we can search by name and send registration request with id  of that class
        return {
            success: true,
            data: _classes,
        }
    } catch (e) {
        console.error(e);
        return {
            success: false,
            message: `Something went wrong with getting classes, please try again later`
        };
    }
}


const tryRegister = (user, classId) => {
    return user.register(classId).then(result => {
        if (! result.success) {
            console.log(`Could not register to class: ${classId}, trying again`);
            return tryRegister(user, classId);
        }

        return true;
    });
}


const _run = async () => {
    const {username, password} = await credentials.read();
    const classes = await readClasses();

    console.log(classes);

    console.log({username, password});
    const user = new User(username, password);

    let loginResult = null;
    try {
        loginResult = await user.login();
    } catch (e) {
        console.log(colors.yellow('Something went wrong, check your connection'));
        return;
    }

    if (! (loginResult && loginResult.success)) {
        console.log(colors.yellow('Invalid Credentials'));
        return;
    }
    console.log(colors.blue('Successfully Logged In'));



    /// ---------------------------------------------------------

    await Promise.all(classes.map(cls => tryRegister(user, cls)));
    console.log('Congratulations')
};

void run()


const sleep = () => {
    return new Promise(resolve => {
        setTimeout(resolve, 1000);
    });
}


// parse username, password and preferable classes from cmd args
//
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

const readClasses = async () => {
    const { classes } = await prompt.get({
        name: 'classes',
        description: auaMessage.create('classes'),
    });


    return classes.split(' ');
};



const parseCredentials = () => {
    const cmdArgs = parseCommandLineArguments()

    console.log(cmdArgs);


};



/*
credentials.read(({username, password}) => {
    console.log(username, password);
})
*/

//console.log(parseCommandLineArguments())
//console.log(parseCredentials());
//console.log( login() );



