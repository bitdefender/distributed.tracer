const safeEval = require('safe-eval');
const crypro = require('crypto');
const path = require('path');

module.exports = safeEval(
    require('fs').readFileSync(path.join(__dirname, "bb.data.js")),
    {
        console: console
    }
);
/*module.exports.HashFunc = (module, offset) => {
    const hash = crypto.createHash('md5');
    hash.update(offset + "|" + module);
    return hash.digest('hex');
}*/
