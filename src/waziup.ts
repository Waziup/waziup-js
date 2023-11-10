import * as mqtt from "precompiled-mqtt";

/**
 * Every sensor, actuator and device can have metadata.
 * This is additional data that can be set by apps and by the Waziup system to provide
 * more information on this sensor or actuator.
 * 
 * Use [[setSensorMeta]], [[setActuatorMeta]] and [[setDeviceMeta]] to modify the metadata.
 */
export type Meta = {
    [key: string]: any;
}

/**
 * All sensors and actuators have a value (and historical values in the database).
 * 
 * Depending on the sensor/actuator kind, the value can be any type.
 */
export type Value = any;
/**
 * When reading and writing values some APIs return the the value and its timestamp.
 */
export type ValueWithTime = {
    value: any;
    time: Date;
}

/**
 * A sensor, actuator or device ID.
 */
export type ID = string;

/**
 * A sensor always belongs to a device.
 */
export type Sensor = {
    /** Unique sensor ID. */
    id: ID;
    /** Sensor name. */
    name: string;
    /** Sensor value. */
    value: Value;
    /** Time at which the sensor was last modified. This includes changes of the name and metadata, but not the upload of new values (see [[time]] for that.). */
    modified: Date;
    /** Time at which the sensor was created. */
    created: Date;
    /** Time at which the last value was uploaded for this sensor. */
    time: Date;
    /** Sensor metadata. */
    meta: Meta;
}

/**
 * An Actuator always belongs to a device.
 */
export type Actuator = {
    /** Unique actuator ID. */
    id: ID;
    /** Actuator name. */
    name: string;
    /** Actuator value. */
    value: Value | null;
    /** Time at which the actuator was last modified. This includes changes of the name and metadata, but not the upload of new values (see [[time]] for that.) */
    modified: Date;
    /** Time at which the actuator was created. */
    created: Date;
    /** Time at which the last value was uploaded for this actuator. */
    time: Date | null;
    /** Actuator metadata. */
    meta: Meta;
}

/**
 * A device can have sensors and actuators.
 */
export type Device = {
    /** Unique device ID. */
    id: ID;
    /** Device name. */
    name: string;
    /** Device sensors. */
    sensors: Sensor[];
    /** Device actuators. */
    actuators: Actuator[];
    /** Time at which the device was last modified. This includes changes of the name and metadata.*/
    modified: Date;
    /** Time at which the device was created. */
    created: Date;
    /** Device metadata. */
    meta: Meta;
}

/**
 * @category Clouds
 */
export type Cloud = {
    id: ID;
    name: string;
    paused: boolean;
    pausing: boolean;
    pausing_mqtt: boolean;
    rest: string;
    mqtt: string;
    username: string;
    password: string;
    token: string;
    statusCode: number;
    statusText: string;
}

/**
 * @category Clouds
 */
export type CloudAction = "create" | "modify" | "sync" | "error" | "delete";

/**
 * @category Clouds
 */
export type CloudStatus = {
    entity: {
        device: string;
        sensor?: string;
        actuators?: string;
    },
    status: {
        action: CloudAction[];
        remote: Date;
        sleep: number;
        wakeup: Date;
    }
};

export type Event = {
    code: number;
    msg: string;
    time: Date;
}

/**
 * See [package.json](https://docs.npmjs.com/files/package.json).
 * @category Apps
 */
export type Package = {
    name: string;
    version: string;
    author?: any;
    homepage?: string;
    waziapp: {
        menu?: {
            [id: string]: {
                primary: string;
                icon: string;
                href: string;
                target?: string;
                prio?: number;
            }
        };
        hook?: string;
    }
}

/**
 * The state of an App is compiled of Docker container data.
 * @category Apps
 */
export type AppState = {
    error: string;
    finishedAt: string;
    health: string;
    paused: string;
    restartPolicy: string;
    running: boolean;
    startedAt: string;
    status: string;
}

/**
 * A Waziup App.
 * @category Apps
 */
export type App = Package & {
    id: string;
    state: AppState;
}

/**
 * A Waziup App Configuration.
 * @category Apps
 */
export interface AppConfig {
    state?: "started" | "stopped" | "starting" | "stopping" | "uninstalled" ;
    restart?: "always" | "on-failure" | "unless-stopped" | "no";
}

///////////////////////////////////////////////////////////////////////////////

/**
 * This class represents a client of the Waziup platform. The client is connected to a specific host: either the [Waziup Cloud](https://dashboard.waziup.io/) or a [Wazigate](https://www.waziup.io/documentation/wazigate/).
 * 
 * From inside an App you can [[connect]] like this:
 * 
 * ```ts
 *   var waziup = await require("waziup")
 *   var gateway = await waziup.connect();
 *   var id = await gateway.getID();
 *   console.log("This Wazigate has the ID:", id);
 * ```
 */
export class Waziup {

    /** @hidden */
    private host: string;
    /** @hidden */
    private auth: string;
    /** @hidden */
    private client: mqtt.Client = null;
    /** @hidden */
    private topics: {
        [id: string]: Set<Function>
    } = {};

    clientID = "dashboard_" + Math.random().toString(16).substr(2, 8);

    /**
     * Construct a new Waziup API client that connects to a given host (either a Wazigate or Waziup Cloud).
     * The auth token must be received by proceeding the login procedure first.
     * 
     * **Use the [[connect]] function to create a new Waziup client for you!**
     * 
     * @param host hostname, like "waziup.io" or an IP address.
     * @param auth login token, recieved by the Gateway or Waziup Cloud.
     * 
     * @hidden
     */
    constructor(host: string, auth: string) {
        this.host = host;
        this.auth = auth;
    }

    /**
     * Get the ID of the Waziup device. *Use on Wazigates only!*
     */
    async getID(): Promise<ID> {
        return this.get<ID>("device/id");
    }
    
    /**
     * Get the device with this ID.
     */
    async getDevice(id?: ID): Promise<Device>;
    /**
     * Get the Wazigate device.
     */
    async getDevice(): Promise<Device>;
    async getDevice(id?: ID): Promise<Device> {
        if (!id) {
            var device = await this.get<Device>("device");
        } else {
            var device = await this.get<Device>(`devices/${id}`);
        }
        polishDevice(device);
        return device;
    }

    /**
     * Get all the declared devices.
     */
    async getDevices(): Promise<Device[]> {
        var devices = await this.get<Device[]>("devices");
        devices.forEach(polishDevice);
        return devices;
    }

    /**
     * Declare a new device.
     * If no ID is set, the Cloud assigns a new ID to the new device and returns the ID.
     * @returns the ID of the new device.
     */
    async addDevice(device: Device): Promise<ID> {
        return this.set<ID>(`devices`, device);
    }

    /**
     * Get the name of a device.
     */
    async getDeviceName(device: ID): Promise<string>;
    /**
     * Get the name of this device. *Use on Wazigates only!*
     */
    async getDeviceName(): Promise<string>;
    async getDeviceName(id?: ID): Promise<string> {
        if (id) {
            var name = await this.get<string>(`device/${id}/name`);
        } else {
            var name = await this.get<string>(`device/name`);
        }
        return name;
    }

    /**
     * Delete a device.
     * This removes the device, all of its Sensors and Actuators and all Values.
     */
    async deleteDevice(device: ID): Promise<void> {
        await this.del(`devices/${device}`);
    }

    /**
     * Set the name of a device.
     */
    async setDeviceName(device: ID, name: string): Promise<void>;
    /**
     * Set the name of this device. *Use on Wazigates only!*
     */
    async setDeviceName(name: string): Promise<void>;
    async setDeviceName(arg1: ID | string, arg2?: string): Promise<void> {
        if (arguments.length === 2) {
            await this.set(`device/${arg1}/name`, arg2);
        } else {
            await this.set(`device/name`, arg1);
        }
    }

    /**
     * Get a devices's metadata.
     */
    async getDeviceMeta(device: ID) {
        return this.get<Meta>(`devices/${device}/meta`);
    }

    /**
     * Set (override) a devices's metadata.
     */
    async setDeviceMeta(device: ID, meta: Meta) {
        return this.set(`devices/${device}/meta`, meta)
    }

    //////////////////////////////////////////////////
    // Sensors

    /**
     * Get all sensors of the device with the given ID.
     */
    async getSensors(device?: ID): Promise<Sensor[]>;
    /**
     * Get all sensors of the Wazigate. *Use on Wazigates only!*
     */
    async getSensors(): Promise<Sensor[]>;
    async getSensors(id?: ID): Promise<Sensor[]> {
        if (!id) {
            var sensors = await this.get<Sensor[]>("sensors");
        } else {
            var sensors = await this.get<Sensor[]>(`devices/${id}/sensors`);
        }
        sensors.forEach(polishEntity);
        return sensors;
    }

    /**
     * Get a sensor of a specific device.
     */
    async getSensor(device: ID, sensor: ID): Promise<Sensor>;
    /**
     * Get a sensor of the Wazigate. *Use on Wazigates only!*
     */
    async getSensor(sensor: ID): Promise<Sensor>;
    async getSensor(id1: ID, id2?: ID): Promise<Sensor> {
        if (!id2) {
            var sensor = await this.get<Sensor>(`sensors/${id1}`);
        } else {
            var sensor = await this.get<Sensor>(`devices/${id1}/sensors/${id2}`);
        }
        polishEntity(sensor);
        return sensor;
    }

    /**
     * Declare a new new sensor to a specific device.
     * @returns the ID of the new sensor.
     */
    async addSensor(device: ID, sensor: Sensor): Promise<ID>;
    /**
     * Declare a new sensor to the Wazigate. *Use on Wazigates only!*
     * @returns the ID of the new sensor.
     */
    async addSensor(sensor: Sensor): Promise<ID>;
    async addSensor(arg1: ID | Sensor, arg2?: Sensor): Promise<ID> {
        if (!arg2) {
            var id = await this.set<ID>(`sensor`, arg1);
        } else {
            var id = await this.set<ID>(`devices/${arg1}/sensors`, arg2);
        }
        return id;
    }

    /**
     * Delete a sensor of a specific device.
     */
    async deleteSensor(device: ID, sensor: ID): Promise<void>;
    /**
     * Delete a sensor of the Wazigate. *Use on Wazigates only!*
     */
    async deleteSensor(sensor: ID): Promise<void>;
    async deleteSensor(id1: ID, id2?: ID): Promise<void> {
        if (!id2) {
            await this.del(`sensors/${id1}`);
        } else {
            await this.del(`devices/${id1}/sensors/${id2}`);
        }
    }

    /**
     * Get the last uploaded value of the sensor.
     */
    async getSensorValue(device: ID, sensor: ID): Promise<Value>;
    /**
     * Get the last uploaded value of the Wazigate-sensor. *Use on Wazigates only!*
     */
    async getSensorValue(sensor: ID): Promise<Value>;
    async getSensorValue(id1: ID, id2?: ID): Promise<Value> {
        if (!id2) {
            var value = await this.get<Value>(`sensors/${id1}/value`);
        } else {
            var value = await this.get<Value>(`devices/${id1}/sensors/${id2}/value`);
        }
        return value;
    }

    /**
     * Add (upload) a new value to the sensor.
     */
    async addSensorValue(device: ID, sensor: ID, value: Value | ValueWithTime): Promise<void>;
    /**
     * Add (upload) a new value to the Wazigate-sensor. *Use on Wazigates only!*
     */
    async addSensorValue(sensor: ID, value: Value | ValueWithTime): Promise<void>;
    async addSensorValue(id1: ID, arg2: ID | Value | ValueWithTime, arg3?: Value | ValueWithTime): Promise<void> {
        if(arguments.length === 2)  {
            await this.set(`sensors/${id1}/value`, arg2);
        } else {
            await this.set(`devices/${id1}/sensors/${arg2}/value`, arg3);
        }
    }

    /**
     * Get (read) uploaded sensor values.
     */
    async getSensorValues(device: ID, sensor: ID): Promise<Value>;
    /**
     * Get (read) uploaded sensor values of the Wazigate-sensor. *Use on Wazigates only!*
     */
    async getSensorValues(sensor: ID): Promise<Value>;
    async getSensorValues(id1: ID, id2?: ID): Promise<Value> {
        if (!id2) {
            var values = await this.get<ValueWithTime[]>(`sensors/${id1}/values`);
        } else {
            var values = await this.get<ValueWithTime[]>(`devices/${id1}/sensors/${id2}/values`);
        }
        values.forEach(polishValue);
        return values;
    }

    /**
     * Add (upload) new values to the sensor.
     */
    async addSensorValues(device: ID, sensor: ID, values: Value[] | ValueWithTime[]): Promise<void>;
    /**
     * Add (upload) new values to the Wazigate-sensor. *Use on Wazigates only!*
     */
    async addSensorValues(sensor: ID, values: Value[] | ValueWithTime[]): Promise<void>;
    async addSensorValues(id1: ID, arg2: ID | Value[] | ValueWithTime[], arg3?: Value[] | ValueWithTime[]): Promise<void> {
        if(arguments.length === 2)  {
            await this.set(`sensors/${id1}/values`, arg2);
        } else {
            await this.set(`devices/${id1}/sensors/${arg2}/values`, arg3);
        }
    }

    /**
     * Set (override) a sensor's name.
     */
    async setSensorName(device: ID, sensor: ID, name: string): Promise<void>;
    /**
     * Set (override) a Wazigate-sensor's name. *Use on Wazigates only!*
     */
    async setSensorName(sensor: ID, name: string): Promise<void>;
    async setSensorName(id1: ID, arg2: ID | string, arg3?: string): Promise<void> {
        if(arguments.length === 2)  {
            await this.set(`sensors/${id1}/name`, arg2);
        } else {
            await this.set(`devices/${id1}/sensors/${arg2}/name`, arg3);
        }
    }

    /**
     * Set (override) a sensor's metadata.
     */
    async setSensorMeta(device: ID, sensor: ID, meta: Meta): Promise<void>;
    /**
     * Set (override) a Wazigate-sensor's metadata. *Use on Wazigates only!*
     */
    async setSensorMeta(sensor: ID, meta: Meta): Promise<void>;
    async setSensorMeta(id1: ID, arg2: ID | Meta, arg3?: Meta): Promise<void> {
        if(arguments.length === 2)  {
            await this.set(`sensors/${id1}/meta`, arg2);
        } else {
            await this.set(`devices/${id1}/sensors/${arg2}/meta`, arg3);
        }
    }

    /**
     * Get a sensor's metadata.
     */
    async getSensorMeta(device: ID, sensor: ID): Promise<Meta>;
    /**
     * Get a Wazigate-sensor's metadata. *Use on Wazigates only!*
     */
    async getSensorMeta(sensor: ID): Promise<Meta>;
    async getSensorMeta(id1: ID, id2?: ID): Promise<Meta> {
        if(!id2)  {
            var meta = await this.get<Meta>(`sensors/${id1}/meta`);
        } else {
            var meta = await this.get<Meta>(`devices/${id1}/sensors/${id2}/meta`);
        }
        return meta;
    }

    //////////////////////////////////////////////////
    // Actuators

        /**
     * Get all actuators of the device with the given ID.
     */
    async getActuators(device?: ID): Promise<Actuator[]>;
    /**
     * Get all actuators of the Wazigate. *Use on Wazigates only!*
     */
    async getActuators(): Promise<Actuator[]>;
    async getActuators(id?: ID): Promise<Actuator[]> {
        if (!id) {
            var actuators = await this.get<Actuator[]>("actuators");
        } else {
            var actuators = await this.get<Actuator[]>(`devices/${id}/actuators`);
        }
        actuators.forEach(polishEntity);
        return actuators;
    }

    /**
     * Get a actuator of a specific device.
     */
    async getActuator(device: ID, actuator: ID): Promise<Actuator>;
    /**
     * Get a actuator of the Wazigate. *Use on Wazigates only!*
     */
    async getActuator(actuator: ID): Promise<Actuator>;
    async getActuator(id1: ID, id2?: ID): Promise<Actuator> {
        if (!id2) {
            var actuator = await this.get<Actuator>(`actuators/${id1}`);
        } else {
            var actuator = await this.get<Actuator>(`devices/${id1}/actuators/${id2}`);
        }
        polishEntity(actuator);
        return actuator;
    }

    /**
     * Declare a new new actuator to a specific device.
     * @returns the ID of the new actuator.
     */
    async addActuator(device: ID, actuator: Actuator): Promise<ID>;
    /**
     * Declare a new actuator to the Wazigate. *Use on Wazigates only!*
     * @returns the ID of the new actuator.
     */
    async addActuator(actuator: Actuator): Promise<ID>;
    async addActuator(arg1: ID | Actuator, arg2?: Actuator): Promise<ID> {
        if (!arg2) {
            var id = await this.set<ID>(`actuator`, arg1);
        } else {
            var id = await this.set<ID>(`devices/${arg1}/actuators`, arg2);
        }
        return id;
    }

    /**
     * Delete a actuator of a specific device.
     */
    async deleteActuator(device: ID, actuator: ID): Promise<void>;
    /**
     * Delete a actuator of the Wazigate. *Use on Wazigates only!*
     */
    async deleteActuator(actuator: ID): Promise<void>;
    async deleteActuator(id1: ID, id2?: ID): Promise<void> {
        if (!id2) {
            await this.del(`actuators/${id1}`);
        } else {
            await this.del(`devices/${id1}/actuators/${id2}`);
        }
    }

    /**
     * Get the last uploaded value of the actuator.
     */
    async getActuatorValue(device: ID, actuator: ID): Promise<Value>;
    /**
     * Get the last uploaded value of the Wazigate-actuator. *Use on Wazigates only!*
     */
    async getActuatorValue(actuator: ID): Promise<Value>;
    async getActuatorValue(id1: ID, id2?: ID): Promise<Value> {
        if (!id2) {
            var value = await this.get<Value>(`actuators/${id1}/value`);
        } else {
            var value = await this.get<Value>(`devices/${id1}/actuators/${id2}/value`);
        }
        return value;
    }

    /**
     * Add (upload) a new value to the actuator.
     */
    async addActuatorValue(device: ID, actuator: ID, value: Value | ValueWithTime): Promise<void>;
    /**
     * Add (upload) a new value to the Wazigate-actuator. *Use on Wazigates only!*
     */
    async addActuatorValue(actuator: ID, value: Value | ValueWithTime): Promise<void>;
    async addActuatorValue(id1: ID, arg2: ID | Value | ValueWithTime, arg3?: Value | ValueWithTime): Promise<void> {
        if(arguments.length === 2)  {
            await this.set(`actuators/${id1}/value`, arg2);
        } else {
            await this.set(`devices/${id1}/actuators/${arg2}/value`, arg3);
        }
    }

    /**
     * Get (read) uploaded actuator values.
     */
    async getActuatorValues(device: ID, actuator: ID): Promise<Value>;
    /**
     * Get (read) uploaded actuator values of the Wazigate-actuator. *Use on Wazigates only!*
     */
    async getActuatorValues(actuator: ID): Promise<Value>;
    async getActuatorValues(id1: ID, id2?: ID): Promise<Value> {
        if (!id2) {
            var values = await this.get<ValueWithTime[]>(`actuators/${id1}/values`);
        } else {
            var values = await this.get<ValueWithTime[]>(`devices/${id1}/actuators/${id2}/values`);
        }
        values.forEach(polishValue);
        return values;
    }

    /**
     * Add (upload) new values to the actuator.
     */
    async addActuatorValues(device: ID, actuator: ID, values: Value[] | ValueWithTime[]): Promise<void>;
    /**
     * Add (upload) new values to the Wazigate-actuator. *Use on Wazigates only!*
     */
    async addActuatorValues(actuator: ID, values: Value[] | ValueWithTime[]): Promise<void>;
    async addActuatorValues(id1: ID, arg2: ID | Value[] | ValueWithTime[], arg3?: Value[] | ValueWithTime[]): Promise<void> {
        if(arguments.length === 2)  {
            await this.set(`actuators/${id1}/values`, arg2);
        } else {
            await this.set(`devices/${id1}/actuators/${arg2}/values`, arg3);
        }
    }

    /**
     * Set (override) a actuator's name.
     */
    async setActuatorName(device: ID, actuator: ID, name: string): Promise<void>;
    /**
     * Set (override) a Wazigate-actuator's name. *Use on Wazigates only!*
     */
    async setActuatorName(actuator: ID, name: string): Promise<void>;
    async setActuatorName(id1: ID, arg2: ID | string, arg3?: string): Promise<void> {
        if(arguments.length === 2)  {
            await this.set(`actuators/${id1}/name`, arg2);
        } else {
            await this.set(`devices/${id1}/actuators/${arg2}/name`, arg3);
        }
    }

    /**
     * Set (override) a actuator's metadata.
     */
    async setActuatorMeta(device: ID, actuator: ID, meta: Meta): Promise<void>;
    /**
     * Set (override) a Wazigate-actuator's metadata. *Use on Wazigates only!*
     */
    async setActuatorMeta(actuator: ID, meta: Meta): Promise<void>;
    async setActuatorMeta(id1: ID, arg2: ID | Meta, arg3?: Meta): Promise<void> {
        if(arguments.length === 2)  {
            await this.set(`actuators/${id1}/meta`, arg2);
        } else {
            await this.set(`devices/${id1}/actuators/${arg2}/meta`, arg3);
        }
    }

    /**
     * Get a actuator's metadata.
     */
    async getActuatorMeta(device: ID, actuator: ID): Promise<Meta>;
    /**
     * Get a Wazigate-actuator's metadata. *Use on Wazigates only!*
     */
    async getActuatorMeta(actuator: ID): Promise<Meta>;
    async getActuatorMeta(id1: ID, id2?: ID): Promise<Meta> {
        if(!id2)  {
            var meta = await this.get<Meta>(`actuators/${id1}/meta`);
        } else {
            var meta = await this.get<Meta>(`devices/${id1}/actuators/${id2}/meta`);
        }
        return meta;
    }

    
    //////////////////////////////////////////////////
    // Apps

    /**
     * @category Clouds
     */
    getClouds(): Promise<{[id: string]: Cloud}> {
        return this.get<{[id: string]: Cloud}>("clouds");
    }

    /**
     * @category Clouds
     */
    addCloud(cloud: Cloud): Promise<ID> {
        return this.set<ID>("clouds", cloud);
    }

    /**
     * @category Clouds
     */
    getCloud(id: ID): Promise<Cloud> {
        return this.get<Cloud>(`clouds/${id}`);
    }

    /**
     * @category Clouds
     */
    deleteCloud(id: ID) {
        return this.del(`clouds/${id}`);
    }

    /**
     * @category Clouds
     */
    setCloudPaused(id: ID, paused: boolean) {
        return this.set(`clouds/${id}/paused`, paused);
    }

    /**
     * @category Clouds
     */
    async setCloudCredentials(id: ID, username: string, token: string) {
        await Promise.all([
            this.set(`clouds/${id}/username`, username),
            this.set(`clouds/${id}/token`, token),
        ]);
    }

    /**
     * @category Clouds
     */
    async getCloudStatus(id: ID): Promise<CloudStatus[]> {
        var status = await this.get<CloudStatus[]>(`clouds/${id}/status`);
        polishCloudStatus(status);
        return status;
    }

    //////////////////////////////////////////////////
    // Apps

    /**
     * @category Apps
     */
    async getApps(): Promise<App[]> {
        return this.get<App[]>("apps");
    }

    /**
     * @category Apps
     */
    async getApp(id: string): Promise<App> {
        return this.get<App>(`apps/${id}`);
    }

    /**
     * @category Apps
     */
    async setAppConfig(id: string, config: AppConfig) {
        return this.set(`apps/${id}`, config);
    }

    /**
     * @category Apps
     */
    uninstallApp(id: string, keepConfig: boolean) {
        return this.del(`apps/${id}?keepConfig=${keepConfig}`);
    }

    /**
     * @category Apps
     */
    installApp(id: string) {
        return this.set(`apps`, id);
    }

    /**
     * @category Apps
     */
    toProxyURL(app: string, path: string) {
        return `${this.host}/apps/${app}/${path}`;
    }

    //////////////////////////////////////////////////
    // Generic API

    /**
     * @category Generic API
     */
    toURL(path: string) {
        if (this.host === "") return path;
        return `${this.host}/${path}`;
    }

    /**
     * @category Generic API
     */
    connectMQTT(onConnect: () => void, onError: (err: Error) => void = null, opt: mqtt.IClientOptions = {}) {
        if (this.client !== null) {
            throw "The Waziup MQTT client is already connected. Use .disconnectMQTT() or .reconnectMQTT()."
        }
        this.client = mqtt.connect(location.protocol.replace("http", "ws")+"//"+location.host, {
            clientId: this.clientID,
            ...opt
        });
        console.log("Connecting to mqtt...");
        this.client.on("connect", onConnect);
        this.client.on("message", (topic: string, pl: Buffer, pkt: mqtt.Packet) => {
            const plString = pl.toString();
            var msg: any;
            try {
                msg = JSON.parse(plString)
            } catch(err) {
                console.error("MQTT: Invalid message payload on topic '%s': %o", topic, plString);
                return
            }
            var listeners = new Set<Function>();
            for(var templ in this.topics) {
                if (matchTopic(templ, topic)) {
                    for(let l of this.topics[templ]) {
                        if(listeners.has(l)) continue;
                        listeners.add(l);
                        try {
                            l(msg, topic);
                        } catch(err) {
                            console.error("MQTT: Message listener '%s' %o:\n%o", topic, l, plString)
                        }
                    }                
                }
            }
            if (listeners.size === 0){
                console.warn("MQTT: Received Message without listeners on topic '%s': %o", topic, plString);
            }
        });
        if(onError) this.client.on("error", onError);
    }

    /**
     * @category Generic API
     */
    disconnectMQTT(onDisconnect: () => void) {
        if (this.client === null) {
            throw "The Waziup MQTT client is disconnected. Use .connectMQTT() first."
        }
        this.client.end(true, null, onDisconnect);
        this.client = null;
    }

    /**
     * @category Generic API
     */
    on(event: "message", cb: (topic: string, payload: Buffer) => void): void;
    on(event: "error", cb: (error: Error) => void): void;
    on(event: "connect", cb: () => void): void;
    on(event: "reconnect", cb: () => void): void;
    on(event: "close", cb: () => void): void;
    on(event: string, cb: Function) {
        switch (event) {
            case "connect":
            case "message":
            case "reconnect":
            case "error":
            case "close":
                if (this.client === null) {
                    throw "The Waziup MQTT client is disconnected. Use .connectMQTT() first."
                }
                this.client.on(event, cb);
        }
    }

    /**
     * @category Generic API
     */
    off(event: "message", cb: (topic: string, payload: Buffer) => void): void;
    off(event: "error", cb: (error: Error) => void): void;
    off(event: "connect", cb: () => void): void;
    off(event: "reconnect", cb: () => void): void;
    off(event: "close", cb: () => void): void;
    off(event: string, cb: Function) {
        switch (event) {
            case "message":
            case "error":
            case "connect":
            case "reconnect":
            case "close":
                if (this.client !== null) {
                    this.client.off(event, cb as any);
                }
        }
    }

    /**
     * @category Generic API
     */
    reconnectMQTT() {
        if (this.client === null) {
            throw ".reconnectMQTT() must be called after .connectMQTT().";
        }
        this.client.reconnect();
    }

    /**
     * @category Generic API
     */
    subscribe<T = any>(path: string, cb: (msg: T, topic: string) => void) {
        if (this.client === null) {
            throw "Call .connectMQTT() before subscribing to paths.";
        }
        if (path in this.topics) {
            this.topics[path].add(cb);
        } else {
            this.topics[path] = new Set([cb]);
            this.client.subscribe(path);
        }
    }

     /**
     * @category Generic API
     */
    unsubscribe(path: string, cb: (data: any, topic: string) => void) {
        if (path in this.topics) {
            this.topics[path].delete(cb);
            if(this.topics[path].size === 0) {
                delete this.topics[path];
                this.client.unsubscribe(path);
            }
        }
    }

    /**
     * @category Generic API
     */
    async get<T>(path: string,token='') {
        var resp = await fetch(this.toURL(path),token?{
            headers:{
                "Cookie": "Token=" + token,
            }
        }:{});
        const contentType = resp.headers.get("Content-Type");
        if(!resp.ok) {
            if(contentType?.startsWith("application/json")) {
                var data = await resp.json();
                throw `HTTP Error ${resp.status} ${resp.statusText}\n${data}`;
            } else {
                var text = await resp.text();
                throw `HTTP Error ${resp.status} ${resp.statusText}\n${data}`;
            }
        }
        if(contentType?.startsWith("application/json")) {
            return resp.json() as Promise<T>;
        }
    }

    async fetch(path: string, init?: RequestInit): Promise<Response> {
        return fetch(path, init);
    }

    /**
     * @category Generic API
     */
    async del<T=void>(path: string) {
        var resp = await fetch(this.toURL(path), {
            method: "DELETE"
        });
        const contentType = resp.headers.get("Content-Type");
        if(!resp.ok) {
            if(contentType?.startsWith("application/json")) {
                var data = await resp.json();
                throw `HTTP Error ${resp.status} ${resp.statusText}\n${data}`;
            } else {
                var text = await resp.text();
                throw `HTTP Error ${resp.status} ${resp.statusText}\n${data}`;
            }
        }
        if(contentType?.startsWith("application/json")) {
            return resp.json() as Promise<T>;
        }
        return;
    }

    /**
     * @category Generic API
     */
    async set<T=void>(path: string, val: any): Promise<T> {
        var resp = await fetch(this.toURL(path), {
            method: "POST",
            headers: {
                "Content-Type": path==='auth/token' ||'auth/retoken'? 'text/plain':'application/json; charset=utf-8'
            },
            body: JSON.stringify(val)
        });
        const contentType = resp.headers.get("Content-Type");
        if(!resp.ok) {
            if(contentType?.startsWith("application/json")) {
                var data = await resp.json();
                throw `HTTP Error ${resp.status} ${resp.statusText}\n${data}`;
            } else {
                var text = await resp.text();
                throw `HTTP Error ${resp.status} ${resp.statusText}\n${data}`;
            }
        }
        if(contentType?.startsWith("application/json")) {
            return resp.json() as Promise<T>;
        }
    }
}

///////////////////////////////////////////////////////////////////////////////

/** @hidden */
function polishEntity(ent: Sensor | Actuator) {
    ent.modified = new Date(ent.modified);
    ent.created = new Date(ent.created);
    if(ent.time) ent.time = new Date(ent.time);
}

/** @hidden */
function polishDevice(device: Device) {
    device.created = new Date(device.created);
    device.modified = new Date(device.modified);
    device.sensors.forEach(polishEntity);
    device.actuators.forEach(polishEntity);
}

/** @hidden */
function polishValue(val: ValueWithTime) {
    val.time = new Date(val.time);
}

/** @hidden */
function polishCloudStatus(status: CloudStatus[]) {
    for(var stat of status) {
        stat.status.remote = new Date(stat.status.remote);
        stat.status.wakeup = new Date(stat.status.wakeup);
    }
}

/** @hidden */
function matchTopic(template: string, topic: string): boolean {
    if (template == topic)
        return true;
    const templateElm = template.split("/")
    const topicElm = topic.split("/")
    for(var i=0; i<templateElm.length; i++) {
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