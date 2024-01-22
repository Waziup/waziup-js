import { Waziup } from "./waziup";
interface ConnectSettings {
    host?: string;
    username?: string;
    password?: string;
    token?: string;
}
declare type Response = {
    wazigateID: string;
    waziup: Waziup;
};
export declare function connect(settings?: ConnectSettings): Promise<Response>;
export {};
