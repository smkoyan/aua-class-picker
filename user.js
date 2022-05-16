const axios = require("axios");
const endpoints = require("./endpoints");
const { JSDOM } = require('jsdom');

class User {
    _axios = axios.create({
        baseURL: 'https://im.aua.am',
    });

    constructor(username, password) {
        this._username = username;
        this._password = password;
    }

    async login() {
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
    }

    async register(classId) {
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
    }

    async drop() {
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
    }

    async fetchClasses() {
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
    }
}

module.exports = User;
