import {
  ReactiveController,
  ReactiveControllerHost,
  ReactiveElement,
} from "lit";
import { StoreSubscriber } from "lit-svelte-stores";
import type { Readable } from "svelte/store";
import {
  onMounted,
  onUnmounted,
  onUpdated,
  onBeforeUpdate,
  getCurrentInstance,
  nextTick,
} from "vue";

class VueControllerHost implements ReactiveControllerHost {
  _controllers: Array<ReactiveController> = [];
  _controller!: ReactiveController;

  _instance;
  _connected = false;

  constructor(instance: any) {
    this._instance = instance;
  }

  addController(c: ReactiveController) {
    this._controllers.push(c);
    if (this._connected) {
      c.hostConnected?.();
    }
  }

  removeController(controller: ReactiveController): void {
    const index = this._controllers.findIndex((c) => c === controller);
    this._controllers.splice(index, 1);
  }

  requestUpdate() {
    this._instance.update();
  }

  get updateComplete() {
    return nextTick().then(() => true);
  }

  connected() {
    this._connected = true;
    this._controllers.forEach((c) => c.hostConnected?.());
  }

  disconnected() {
    this._connected = false;
    this._controllers.forEach((c) => c.hostDisconnected?.());
  }

  update() {
    this._controllers.forEach((c) => c.hostUpdate?.());
  }

  updated() {
    this._controllers.forEach((c) => c.hostUpdated?.());
  }
}

export const makeVueController = (
  factory: (host: ReactiveControllerHost) => ReactiveController
) => {
  const instance = getCurrentInstance();
  const host = new VueControllerHost(instance);
  const controller = factory(host);

  onMounted(() => {
    host.connected();
  });

  onUnmounted(() => {
    host.disconnected();
  });

  onBeforeUpdate(() => {
    host.update();
  });

  onUpdated(() => {
    host.updated();
  });
  return controller;
};

export function useStore<V>(getStore: () => Readable<V>) {
  return makeVueController(
    (host) => new StoreSubscriber(host as ReactiveElement, getStore)
  );
}
