import { randomUUID } from "crypto";
import { getFirebaseDb, initFirebase } from "./firebase";

type DataRecord = unknown;

class DataStore {
  private readonly useFirebase: boolean;
  private readonly memory: Record<string, Record<string, unknown>> = {};

  constructor() {
    this.useFirebase = initFirebase();
  }

  async getAll<T>(collection: string): Promise<Record<string, T>> {
    if (this.useFirebase) {
      const snap = await getFirebaseDb().ref(collection).get();
      return (snap.val() as Record<string, T>) ?? {};
    }
    return (this.memory[collection] as Record<string, T>) ?? {};
  }

  async getOne<T>(collection: string, id: string): Promise<T | null> {
    if (this.useFirebase) {
      const snap = await getFirebaseDb().ref(`${collection}/${id}`).get();
      return (snap.val() as T) ?? null;
    }
    return ((this.memory[collection] ?? {})[id] as T) ?? null;
  }

  async setOne(collection: string, id: string, value: DataRecord): Promise<void> {
    if (this.useFirebase) {
      await getFirebaseDb().ref(`${collection}/${id}`).set(value);
      return;
    }
    this.memory[collection] = this.memory[collection] ?? {};
    this.memory[collection][id] = value;
  }

  async updateOne(collection: string, id: string, value: Record<string, unknown>): Promise<void> {
    if (this.useFirebase) {
      await getFirebaseDb().ref(`${collection}/${id}`).update(value);
      return;
    }
    this.memory[collection] = this.memory[collection] ?? {};
    const oldValue = (this.memory[collection][id] as Record<string, unknown>) ?? {};
    this.memory[collection][id] = { ...oldValue, ...value };
  }

  async deleteOne(collection: string, id: string): Promise<void> {
    if (this.useFirebase) {
      await getFirebaseDb().ref(`${collection}/${id}`).remove();
      return;
    }
    if (!this.memory[collection]) return;
    delete this.memory[collection][id];
  }

  newId() {
    return randomUUID();
  }

  clearMemory() {
    Object.keys(this.memory).forEach((k) => delete this.memory[k]);
  }
}

export const dataStore = new DataStore();
