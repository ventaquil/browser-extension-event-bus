import EventBus from "../../src/core/eventBus";
import {Config} from "../../src";
import {IEventBusBuffer} from "../../src/iEventBusBuffer";

/**
 * Dummy implementation that is simulating behavior of local storage
 */
class DummyStorage implements IEventBusBuffer {
    private storage: Map<string, unknown> = new Map<string, unknown>();
    // eslint-disable-next-line @typescript-eslint/ban-types
    private changeListener!: Function;

    // eslint-disable-next-line @typescript-eslint/ban-types
    registerListener(changeListener: Function): void {
        this.changeListener = changeListener;
    }

    remove(key: string): Promise<boolean> {
        const oldValue = this.storage.get(key);
        const result= this.storage.delete(key);

        if (this.changeListener) {
            const temp = new Map<string, unknown>();
            temp.set(key, {
                oldValue: oldValue,
                newValue: undefined,
            })

            this.changeListener(temp);
        }

        return Promise.resolve(result);
    }

    save(key: string, data: unknown): Promise<boolean> {
        const oldValue = this.storage.get(key);
        this.storage.set(key, data);

        if (this.changeListener) {
            const temp: Map<string, unknown> = new Map<string, unknown>();
            temp.set(key, {
                oldValue: oldValue,
                newValue: data,
            })

            this.changeListener(temp);
        }

        return Promise.resolve(true);
    }

    size(): number {
        return this.storage.size;
    }

}

describe('eventBus.test.ts', () => {
    it('should sent event correctly',  async () => {
        // given
        const topicName: string = 'testTopic';
        const testData: string = 'testData';
        const buffer = new DummyStorage()
        const underTest = new EventBus(Config.of('test', '#', false), buffer);

        let spy: boolean = false;
        await underTest.subscribe(topicName, (data: unknown) => {
            if (data === testData) {
                spy = true;
            }
        })

        // when
        await underTest.send(topicName, testData)

        // then
        expect(spy).toBeTruthy();
        expect(buffer.size()).toBe(1);
    })

    it('should clear buffer after handling event',  async () => {
        // given
        const topicName: string = 'testTopic';
        const testData: string = 'testData';
        const buffer = new DummyStorage()
        const underTest = new EventBus(Config.of('test', '#', true), buffer);

        await underTest.subscribe(topicName, (data: unknown) => {
            console.log(data);
        })

        // when
        await underTest.send(topicName, testData)

        // then
        expect(buffer.size()).toBe(0);
    });

    it('should not send event when there is no subscriber',  async () => {
        // given
        const topicName: string = 'testTopic';
        const testData: string = 'testData';
        const buffer = new DummyStorage()
        const underTest = new EventBus(Config.of('test', '#', true), buffer);

        // when
        const result  = await underTest.send(topicName, testData)

        // then
        expect(result).toBeTruthy();
    });

    it('should deliver primitive payloads like numbers',  async () => {
        // given
        const buffer = new DummyStorage()
        const underTest = new EventBus(Config.of('test', '#', false), buffer);

        let received: unknown = 'NOT CALLED';
        await underTest.subscribe('numbers', (data: unknown) => {
            received = data;
        })

        // when
        await underTest.send('numbers', 10)

        // then
        expect(received).toBe(10);
    });

    it('should ignore storage changes that are not bus events',  async () => {
        // given
        const buffer = new DummyStorage()
        const underTest = new EventBus(Config.of('test', '#', false), buffer);

        let received: unknown = undefined;
        await underTest.subscribe('settings', (data: unknown) => {
            received = data;
        })

        // when: a foreign key changes in the same storage area
        await buffer.save('user_settings_theme', { isEmpty: false, data: { theme: 'dark' } })

        // then
        expect(received).toBeUndefined();
    });

    it('should handle topic names containing the delimiter',  async () => {
        // given
        const topicName: string = 'my#topic';
        const buffer = new DummyStorage()
        const underTest = new EventBus(Config.of('test', '#', false), buffer);

        let received: unknown = undefined;
        await underTest.subscribe(topicName, (data: unknown) => {
            received = data;
        })

        // when
        await underTest.send(topicName, 'payload')

        // then
        expect(received).toBe('payload');
    });
});

