"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mqtt = require("precompiled-mqtt");
class Waziup {
    constructor(host) {
        this.client = null;
        this.topics = {};
        this.clientID = "dashboard_" + Math.random().toString(16).substr(2, 8);
        this.host = host;
        this.auth = '';
    }
    async getID() {
        return this.get("device/id");
    }
    async authToken(username, password) {
        return this.set("auth/token", { username, password });
    }
    async setToken(token) {
        this.auth = token;
    }
    async getProfile() {
        return this.get("auth/profile");
    }
    async getDevice(id) {
        if (!id) {
            var device = await this.get("device");
        }
        else {
            var device = await this.get(`devices/${id}`);
        }
        polishDevice(device);
        return device;
    }
    async getDevices() {
        var devices = await this.get("devices");
        devices.forEach(polishDevice);
        return devices;
    }
    async addDevice(device) {
        return this.set(`devices`, device);
    }
    async getDeviceName(id) {
        if (id) {
            var name = await this.get(`device/${id}/name`);
        }
        else {
            var name = await this.get(`device/name`);
        }
        return name;
    }
    async deleteDevice(device) {
        await this.del(`devices/${device}`);
    }
    async setDeviceName(arg1, arg2) {
        if (arguments.length === 2) {
            await this.set(`devices/${arg1}/name`, arg2);
        }
        else {
            await this.set(`devices/name`, arg1);
        }
    }
    async getDeviceMeta(device) {
        return this.get(`devices/${device}/meta`);
    }
    async setDeviceMeta(device, meta) {
        return this.set(`devices/${device}/meta`, meta);
    }
    async getSensors(id) {
        if (!id) {
            var sensors = await this.get("sensors");
        }
        else {
            var sensors = await this.get(`devices/${id}/sensors`);
        }
        sensors.forEach(polishEntity);
        return sensors;
    }
    async getSensor(id1, id2) {
        if (!id2) {
            var sensor = await this.get(`sensors/${id1}`);
        }
        else {
            var sensor = await this.get(`devices/${id1}/sensors/${id2}`);
        }
        polishEntity(sensor);
        return sensor;
    }
    async addSensor(arg1, arg2) {
        if (!arg2) {
            var id = await this.set(`sensor`, arg1);
        }
        else {
            var id = await this.set(`devices/${arg1}/sensors`, arg2);
        }
        return id;
    }
    async deleteSensor(id1, id2) {
        if (!id2) {
            await this.del(`sensors/${id1}`);
        }
        else {
            await this.del(`devices/${id1}/sensors/${id2}`);
        }
    }
    async getSensorValue(id1, id2) {
        if (!id2) {
            var value = await this.get(`sensors/${id1}/value`);
        }
        else {
            var value = await this.get(`devices/${id1}/sensors/${id2}/value`);
        }
        return value;
    }
    async addSensorValue(id1, arg2, arg3) {
        if (arguments.length === 2) {
            await this.set(`sensors/${id1}/value`, arg2);
        }
        else {
            await this.set(`devices/${id1}/sensors/${arg2}/value`, arg3);
        }
    }
    async getSensorValues(deviceId, sensorID, limit) {
        if (!sensorID) {
            var values = await this.get(`sensors/${deviceId}/values?limit=${limit ? limit : 500}`);
        }
        else {
            var values = await this.get(`devices/${deviceId}/sensors/${sensorID}/values?limit=${limit ? limit : 500}`);
        }
        values.forEach(polishValue);
        return values;
    }
    async addSensorValues(id1, arg2, arg3) {
        if (arguments.length === 2) {
            await this.set(`sensors/${id1}/values`, arg2);
        }
        else {
            await this.set(`devices/${id1}/sensors/${arg2}/values`, arg3);
        }
    }
    async setSensorName(id1, arg2, arg3) {
        if (arguments.length === 2) {
            await this.set(`sensors/${id1}/name`, arg2);
        }
        else {
            await this.set(`devices/${id1}/sensors/${arg2}/name`, arg3);
        }
    }
    async setSensorMeta(id1, arg2, arg3) {
        if (arguments.length === 2) {
            await this.set(`sensors/${id1}/meta`, arg2);
        }
        else {
            await this.set(`devices/${id1}/sensors/${arg2}/meta`, arg3);
        }
    }
    async getSensorMeta(id1, id2) {
        if (!id2) {
            var meta = await this.get(`sensors/${id1}/meta`);
        }
        else {
            var meta = await this.get(`devices/${id1}/sensors/${id2}/meta`);
        }
        return meta;
    }
    async getActuators(id) {
        if (!id) {
            var actuators = await this.get("actuators");
        }
        else {
            var actuators = await this.get(`devices/${id}/actuators`);
        }
        actuators.forEach(polishEntity);
        return actuators;
    }
    async getActuator(id1, id2) {
        if (!id2) {
            var actuator = await this.get(`actuators/${id1}`);
        }
        else {
            var actuator = await this.get(`devices/${id1}/actuators/${id2}`);
        }
        polishEntity(actuator);
        return actuator;
    }
    async addActuator(arg1, arg2) {
        if (!arg2) {
            var id = await this.set(`actuator`, arg1);
        }
        else {
            var id = await this.set(`devices/${arg1}/actuators`, arg2);
        }
        return id;
    }
    async deleteActuator(id1, id2) {
        if (!id2) {
            await this.del(`actuators/${id1}`);
        }
        else {
            await this.del(`devices/${id1}/actuators/${id2}`);
        }
    }
    async getActuatorValue(id1, id2) {
        if (!id2) {
            var value = await this.get(`actuators/${id1}/value`);
        }
        else {
            var value = await this.get(`devices/${id1}/actuators/${id2}/value`);
        }
        return value;
    }
    async addActuatorValue(id1, arg2, arg3) {
        if (arguments.length === 2) {
            await this.set(`actuators/${id1}/value`, arg2);
        }
        else {
            await this.set(`devices/${id1}/actuators/${arg2}/value`, arg3);
        }
    }
    async getActuatorValues(deviceID, actuatorID, limit) {
        if (!actuatorID) {
            var values = await this.get(`actuators/${deviceID}/values?limit=${limit ? limit : 500}`);
        }
        else {
            var values = await this.get(`devices/${deviceID}/actuators/${actuatorID}/values?limit=${limit ? limit : 500}`);
        }
        values.forEach(polishValue);
        return values;
    }
    async addActuatorValues(id1, arg2, arg3) {
        if (arguments.length === 2) {
            await this.set(`actuators/${id1}/values`, arg2);
        }
        else {
            await this.set(`devices/${id1}/actuators/${arg2}/values`, arg3);
        }
    }
    async setActuatorName(id1, arg2, arg3) {
        if (arguments.length === 2) {
            await this.set(`actuators/${id1}/name`, arg2);
        }
        else {
            await this.set(`devices/${id1}/actuators/${arg2}/name`, arg3);
        }
    }
    async setActuatorMeta(id1, arg2, arg3) {
        if (arguments.length === 2) {
            await this.set(`actuators/${id1}/meta`, arg2);
        }
        else {
            await this.set(`devices/${id1}/actuators/${arg2}/meta`, arg3);
        }
    }
    async getActuatorMeta(id1, id2) {
        if (!id2) {
            var meta = await this.get(`actuators/${id1}/meta`);
        }
        else {
            var meta = await this.get(`devices/${id1}/actuators/${id2}/meta`);
        }
        return meta;
    }
    getClouds() {
        return this.get("clouds");
    }
    addCloud(cloud) {
        return this.set("clouds", cloud);
    }
    getCloud(id) {
        return this.get(`clouds/${id}`);
    }
    deleteCloud(id) {
        return this.del(`clouds/${id}`);
    }
    setCloudPaused(id, paused) {
        return this.set(`clouds/${id}/paused`, paused);
    }
    async setCloudCredentials(id, username, token) {
        await Promise.all([
            this.set(`clouds/${id}/username`, username),
            this.set(`clouds/${id}/token`, token),
        ]);
    }
    async getCloudStatus(id) {
        var status = await this.get(`clouds/${id}/status`);
        polishCloudStatus(status);
        return status;
    }
    async getApps() {
        return this.get("apps");
    }
    async getApp(id) {
        return this.get(`apps/${id}`);
    }
    async setAppConfig(id, config) {
        return this.set(`apps/${id}`, config);
    }
    async startStopApp(id, config) {
        return this.set(`apps/${id}`, config);
    }
    uninstallApp(id, keepConfig) {
        return this.del(`apps/${id}?keepConfig=${keepConfig}`);
    }
    installApp(id) {
        return this.set(`apps`, id);
    }
    toProxyURL(app, path) {
        return `${this.host}/apps/${app}/${path}`;
    }
    toURL(path) {
        if (this.host === "")
            return path;
        const URL = `${this.host}/${path}`;
        return URL;
    }
    connectMQTT(onConnect, onError = null, opt = {}) {
        if (this.client !== null) {
            throw "The Waziup MQTT client is already connected. Use .disconnectMQTT() or .reconnectMQTT().";
        }
        this.client = mqtt.connect(location.protocol.replace("http", "ws") + "//" + location.host, {
            clientId: this.clientID,
            ...opt
        });
        console.log("Connecting to mqtt...");
        this.client.on("connect", onConnect);
        this.client.on("message", (topic, pl, pkt) => {
            const plString = pl.toString();
            var msg;
            try {
                msg = JSON.parse(plString);
            }
            catch (err) {
                console.error("MQTT: Invalid message payload on topic '%s': %o", topic, plString);
                return;
            }
            var listeners = new Set();
            for (var templ in this.topics) {
                if (matchTopic(templ, topic)) {
                    for (let l of this.topics[templ]) {
                        if (listeners.has(l))
                            continue;
                        listeners.add(l);
                        try {
                            l(msg, topic);
                        }
                        catch (err) {
                            console.error("MQTT: Message listener '%s' %o:\n%o", topic, l, plString);
                        }
                    }
                }
            }
            if (listeners.size === 0) {
                console.warn("MQTT: Received Message without listeners on topic '%s': %o", topic, plString);
            }
        });
        if (onError)
            this.client.on("error", onError);
    }
    disconnectMQTT(onDisconnect) {
        if (this.client === null) {
            throw "The Waziup MQTT client is disconnected. Use .connectMQTT() first.";
        }
        this.client.end(true, null, onDisconnect);
        this.client = null;
    }
    on(event, cb) {
        switch (event) {
            case "connect":
            case "message":
            case "reconnect":
            case "error":
            case "close":
                if (this.client === null) {
                    throw "The Waziup MQTT client is disconnected. Use .connectMQTT() first.";
                }
                this.client.on(event, cb);
        }
    }
    off(event, cb) {
        switch (event) {
            case "message":
            case "error":
            case "connect":
            case "reconnect":
            case "close":
                if (this.client !== null) {
                    this.client.off(event, cb);
                }
        }
    }
    reconnectMQTT() {
        if (this.client === null) {
            throw ".reconnectMQTT() must be called after .connectMQTT().";
        }
        this.client.reconnect();
    }
    subscribe(path, cb) {
        if (this.client === null) {
            throw "Call .connectMQTT() before subscribing to paths.";
        }
        if (path in this.topics) {
            this.topics[path].add(cb);
        }
        else {
            this.topics[path] = new Set([cb]);
            this.client.subscribe(path);
        }
    }
    unsubscribe(path, cb) {
        if (path in this.topics) {
            this.topics[path].delete(cb);
            if (this.topics[path].size === 0) {
                delete this.topics[path];
                this.client.unsubscribe(path);
            }
        }
    }
    getTokenExpiry(token) {
        if (!token)
            return 0;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp * 1000;
        }
        catch (error) {
            console.log("Failed to parse token: ", error);
            return 0;
        }
    }
    isTokenExpiringSoon(token, buffer = 120000) {
        const expiry = this.getTokenExpiry(token);
        return Date.now() >= (expiry - buffer);
    }
    async get(path) {
        var _a, _b;
        if (this.isTokenExpiringSoon(this.auth)) {
            try {
                const tokenResp = await fetch(this.toURL('auth/retoken'), {
                    method: "POST",
                    headers: {
                        'Authorization': 'Bearer ' + this.auth,
                    }
                });
                if (!tokenResp.ok) {
                    throw new Error(`Failed to refresh token: ${tokenResp.statusText}`);
                }
                const token = await tokenResp.json();
                sessionStorage.setItem('token', token);
                await this.setToken(token);
                this.auth = token;
            }
            catch (error) {
                console.error("Error refreshing token: ", error);
                throw "Failed to refresh token. Please log in again.";
            }
        }
        const resp = await fetch(this.toURL(path), {
            method: "GET",
            headers: {
                'Authorization': 'Bearer ' + this.auth,
            }
        });
        const contentType = resp.headers.get("Content-Type");
        if (!resp.ok) {
            if ((_a = contentType) === null || _a === void 0 ? void 0 : _a.startsWith("application/json")) {
                var data = await resp.json();
                throw `HTTP Error ${resp.status} ${resp.statusText}\n${data}`;
            }
            else {
                var text = await resp.text();
                if (text) {
                    throw text;
                }
                throw `HTTP Error ${resp.status} ${resp.statusText}`;
            }
        }
        if ((_b = contentType) === null || _b === void 0 ? void 0 : _b.startsWith("application/json")) {
            return resp.json();
        }
    }
    async fetch(path, init) {
        return fetch(path, init);
    }
    async del(path) {
        var _a, _b;
        var resp = await fetch(this.toURL(path), {
            method: "DELETE",
            headers: {
                'Authorization': 'Bearer ' + this.auth,
            },
        });
        const contentType = resp.headers.get("Content-Type");
        if (!resp.ok) {
            if ((_a = contentType) === null || _a === void 0 ? void 0 : _a.startsWith("application/json")) {
                var data = await resp.json();
                throw `HTTP Error ${resp.status} ${resp.statusText}\n${data}`;
            }
            else {
                var text = await resp.text();
                throw `HTTP Error ${resp.status} ${resp.statusText}\n${data}`;
            }
        }
        if ((_b = contentType) === null || _b === void 0 ? void 0 : _b.startsWith("application/json")) {
            return resp.json();
        }
        return;
    }
    async set(path, val) {
        var _a, _b, _c;
        if (this.auth && this.isTokenExpiringSoon(this.auth)) {
            try {
                const tokenResp = await fetch(this.toURL('auth/retoken'), {
                    method: "POST",
                    headers: {
                        'Authorization': 'Bearer ' + this.auth,
                    }
                });
                if (!tokenResp.ok) {
                    throw new Error(`Failed to refresh token: ${tokenResp.statusText}`);
                }
                const token = await tokenResp.json();
                sessionStorage.setItem('token', token);
                await this.setToken(token);
                this.auth = token;
            }
            catch (error) {
                console.error("Error refreshing token", error);
                throw "Failed to refresh token. Please log in again.";
            }
        }
        const headers = {
            "Content-Type": 'application/json; charset=utf-8',
        };
        if ((path !== this.auth) || (path !== 'auth/retoken')) {
            headers['Authorization'] = 'Bearer ' + this.auth;
        }
        const resp = await fetch(this.toURL(path), {
            method: "POST",
            headers: headers,
            body: JSON.stringify(val)
        });
        const contentType = resp.headers.get("Content-Type");
        if (!resp.ok) {
            if ((_a = contentType) === null || _a === void 0 ? void 0 : _a.startsWith("application/json")) {
                var data = await resp.json();
                throw `HTTP Error ${resp.status} ${resp.statusText}\n${data}`;
            }
            else {
                var text = await resp.text();
                if (text) {
                    throw text;
                }
                throw `HTTP Error ${resp.status} ${resp.statusText}`;
            }
        }
        if ((_b = contentType) === null || _b === void 0 ? void 0 : _b.startsWith("application/json")) {
            return resp.json();
        }
        else if ((_c = contentType) === null || _c === void 0 ? void 0 : _c.startsWith("text/plain")) {
            return resp.text();
        }
        else {
            return;
        }
    }
}
exports.Waziup = Waziup;
function polishEntity(ent) {
    ent.modified = new Date(ent.modified);
    ent.created = new Date(ent.created);
    if (ent.time)
        ent.time = new Date(ent.time);
}
function polishDevice(device) {
    device.created = new Date(device.created);
    device.modified = new Date(device.modified);
    device.sensors.forEach(polishEntity);
    device.actuators.forEach(polishEntity);
}
function polishValue(val) {
    val.time = new Date(val.time);
}
function polishCloudStatus(status) {
    for (var stat of status) {
        stat.status.remote = new Date(stat.status.remote);
        stat.status.wakeup = new Date(stat.status.wakeup);
    }
}
function matchTopic(template, topic) {
    if (template == topic)
        return true;
    const templateElm = template.split("/");
    const topicElm = topic.split("/");
    for (var i = 0; i < templateElm.length; i++) {
        const elm = templateElm[i];
        if (elm === "#")
            return true;
        if (i >= topic.length)
            return false;
        if (elm === "+")
            continue;
        if (elm != topicElm[i])
            return false;
    }
    return topicElm.length === templateElm.length;
}
//# sourceMappingURL=waziup.js.map