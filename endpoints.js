// TODO: use axios global configuration to have BASE_URL(take it from .env) and use relative paths here
module.exports = {
    login: 'https://im.aua.am/Account/Login',
    classList: 'https://im.aua.am/Student/ClassRegistration',
    classListTMP: 'https://im.aua.am/Student/UserClass', // temporary endpoint for testing purposes as classes closed right now
    register: 'https://im.aua.am/Student/StudentClassRegister/',
    drop: 'https://im.aua.am/Student/DropClass'
};
