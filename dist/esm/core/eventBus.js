export default class EventBus {
    constructor(config, storage) {
        this.listeners = new Map();
        this.config = config;
        this.storage = storage;
        this.storage.registerListener(async (map) => {
            await this.handle(map);
        });
    }
    async send(topic, data) {
        if (!this.hasSubscribers(topic)) {
            return true;
        }
        const key = this.generateKey(topic);
        return await this.storage.save(key, {
            isEmpty: this.isEmptyEvent(data),
            data: data
        });
    }
    // TODO: subscribe for many topics at the same time
    async subscribe(topic, f) {
        const temp = this.listeners.get(topic);
        if (!temp) {
            this.listeners.set(topic, [f]);
            return;
        }
        temp.push(f);
        this.listeners.set(topic, temp);
    }
    hasSubscribers(topic) {
        return this.listeners.has(topic);
    }
    async handle(map) {
        const eventKeyPrefix = this.config.prefix + this.config.delimiter;
        for (let [key, value] of map.entries()) {
            if (key.startsWith(eventKeyPrefix) && this.isNewEvent(value)) {
                const topic = this.retrieveTopic(key);
                console.info('[EventBus] Handling event with id: ' + key);
                const listeners = this.listeners.get(topic);
                if (listeners && listeners.length > 0) {
                    for (const listener of listeners) {
                        const data = value.newValue.data;
                        if (!this.isEmptyEvent(data)) {
                            listener(data);
                        }
                        else {
                            listener();
                        }
                    }
                    if (this.config.removeOnceReceived) {
                        await this.storage.remove(key);
                    }
                }
            }
        }
    }
    isNewEvent(value) {
        return value && !value.oldValue && value.newValue;
    }
    getTime() {
        return new Date().getTime();
    }
    isEmptyEvent(data) {
        if (data === undefined || data === null) {
            return true;
        }
        return typeof data === 'object' && Object.keys(data).length === 0;
    }
    generateKey(topic) {
        return this.config.prefix + this.config.delimiter + topic + this.config.delimiter + this.getTime();
    }
    retrieveTopic(key) {
        const start = this.config.prefix.length + this.config.delimiter.length;
        const end = key.lastIndexOf(this.config.delimiter);
        return key.substring(start, end);
    }
}
