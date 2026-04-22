import { EventEmitter } from "node:events";

type EventMapConstraint<T> = {
  [K in keyof T]: unknown[];
};

export class TypedEventEmitter<TEvents extends EventMapConstraint<TEvents>> {
  private readonly emitter = new EventEmitter();

  on<K extends keyof TEvents>(
    eventName: K,
    listener: (...args: TEvents[K]) => void,
  ): this {
    this.emitter.on(eventName as string, listener as (...args: any[]) => void);
    return this;
  }

  once<K extends keyof TEvents>(
    eventName: K,
    listener: (...args: TEvents[K]) => void,
  ): this {
    this.emitter.once(
      eventName as string,
      listener as (...args: any[]) => void,
    );
    return this;
  }

  off<K extends keyof TEvents>(
    eventName: K,
    listener: (...args: TEvents[K]) => void,
  ): this {
    this.emitter.off(eventName as string, listener as (...args: any[]) => void);
    return this;
  }

  emit<K extends keyof TEvents>(eventName: K, ...args: TEvents[K]): boolean {
    return this.emitter.emit(eventName as string, ...args);
  }

  removeAllListeners<K extends keyof TEvents>(eventName?: K): this {
    this.emitter.removeAllListeners(eventName as string | undefined);
    return this;
  }

  listenerCount<K extends keyof TEvents>(eventName: K): number {
    return this.emitter.listenerCount(eventName as string);
  }
}
