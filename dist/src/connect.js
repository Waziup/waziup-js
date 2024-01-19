"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const waziup_1 = require("./waziup");
async function connect(settings) {
    if (settings) {
        var host = settings.host;
        var token = settings.token;
    }
    else {
        var host = "";
        var token = "";
    }
    return new waziup_1.Waziup(host, token);
}
exports.connect = connect;
//# sourceMappingURL=connect.js.map