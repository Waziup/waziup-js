"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const waziup_1 = require("./waziup");
async function connect(settings) {
    try {
        if (settings.host) {
            var resp = await fetch(settings.host + "/device/id", {
                headers: {
                    'Content-Type': 'text/plain'
                }
            });
            if (!resp.ok) {
                var data = await resp.json();
                throw `HTTP Error ${resp.status} ${resp.statusText}\n${data}`;
            }
            var wazigateID = await resp.text();
            return {
                wazigateID,
                waziup: new waziup_1.Waziup(settings.host),
            };
        }
        else {
            throw "No host specified";
        }
    }
    catch (error) {
        throw error;
    }
}
exports.connect = connect;
//# sourceMappingURL=connect.js.map