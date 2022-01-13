const colors = require("colors/safe");

exports.log = function (message) {
    console.log(colors.bgBlue(colors.yellow(colors.bold(message))));
};

exports.create = function (message) {
    return colors.bgBlue(colors.yellow(colors.bold(message)))
};



