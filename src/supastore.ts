import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { GenericSchema } from "@supabase/supabase-js/dist/module/lib/types";
import { StoreDefinition, defineStore } from "pinia";

type SupaStoreLike = (() => StoreDefinition<string, any, any, Record<string, any> & { add: (entities: any[]) => any[] }>) & { tableName: string };

export function defineSupaStore<Database, SchemaName extends string & keyof Database, Schema extends GenericSchema, TableName extends string & keyof Schema['Tables'], Relations extends Record<string, SupaStoreLike>>(supabase: SupabaseClient<Database, SchemaName, Schema>, tableName: TableName, relations?: Relations) {

  const table = () => supabase.from(tableName);
  type Row = Schema['Tables'][TableName]['Row'];
  type Insert = Schema['Tables'][TableName]['Insert'];
  type Update = Schema['Tables'][TableName]['Update'];
  type SelectOptions = { include?: (keyof Relations)[] };

  type FilterBuilder = ReturnType<ReturnType<typeof table>['select']>;

  const storeDefinition = defineStore(`supabase-${String(tableName)}`, {
    state: () => {
      const state = {
        _subscribed: false,
        _channel: null as null | RealtimeChannel,
        [tableName]: {},
      } as { [K in TableName]: Record<string, Row> } & { _channel: null | RealtimeChannel, _subscribed: boolean };
      return state;
    },

    actions: {
      add(entities: Row[]) {
        const otherStores = relations ? Object.values(relations).map(useStore => useStore()) : [];

        return entities.map(entity => {
          // Get the reactive proxy from the store
          let proxy = (this as any)[tableName][(entity as any).id];

          // Record already axists in the store, so we just need to update it
          if (proxy) {
            Object.assign(proxy, entity);
          } else {
            proxy = (this as any)[tableName][(entity as any).id] = entity;
          }

          // Add relational data
          if (relations) {
            Object.entries(relations).forEach(([relationName, { tableName }], index) => {
              if ((entity as any)[tableName]) {
                const store = otherStores[index];
                const entities = Array.isArray((entity as any)[tableName]) ? (entity as any)[tableName] : [(entity as any)[tableName]];
                const mappedEntities = (store as any).add(entities);
                (entity as any)[relationName] = Array.isArray((entity as any)[tableName]) ? mappedEntities : mappedEntities[0];
              }
            });
          }
          return proxy;
        }) as Row[];
      },

      remove(id: Row['id']) {
        delete (this as any)[tableName][id];
      },

      // Generates a select key with optional relational data inclusion
      getKey(key: '*' | undefined, options: SelectOptions) {
        let _key: string = key || '*';
        if (options?.include && relations) {
          _key = [_key, ...options.include.map(key => `${(relations[key] as any).tableName as string}(*)`)].join(',');
        }

        return _key;
      },

      async select(key: '*' | undefined, options?: SelectOptions) {
        const _key = options?.include ? this.getKey(key, options) : key;
        const cacheKey = `_loaded-${key}`;

        if ((this as any)[cacheKey]) {
          return Object.values((this as any)[tableName] as Row[]);
        }

        const { data, error } = await table().select(_key as '*');
        if (error) {
          throw error;
        }

        (this as any)[cacheKey] = true;

        return this.add(data as Row[]);
      },

      async update(id: Row['id'], data: Partial<Update>) {
        const { data: items, error } = await table().update(data as any).eq('id', id as any).select('*');

        if (error) {
          throw error;
        }

        const [item] = items;

        if (!item) {
          throw new Error(`Could not save ${tableName}:${id}. Perhaps a problem with RLS?`);
        }

        Object.assign((this as any)[tableName][id], item);

        return (this as any)[tableName][id] as Row;
      },

      async updateMany(ids: Row['id'][], data: Partial<Update>) {
        const { data: items, error } = await table().update(data as any).in('id', ids).select('*');

        if (error) {
          throw error;
        }

        if (items?.length !== ids.length) {
          throw new Error(`Could not update all. Perhaps a problem with RLS?`);
        }

        let errors = [];
        items.forEach((item) => {
          if (item.error) {
            errors.push(item.error);
            return;
          }

          // TODO: double check this, TS seems to be off - is item a string?
          Object.assign((this as any)[tableName][(item as any).id], item);
        });
      },

      async delete(id: Row['id']) {
        const { data: items, error } = await table().delete().eq('id', id as any).select('*');

        if (items?.length === 0) {
          throw new Error(`Could not delete ${tableName}:${id}. Perhaps a problem with RLS?`);
        }

        if (Number(items?.length) > 1) {
          console.error(`Deleting ${tableName}:${id}`)
          throw new Error('Something went wrong');
        }

        if (error) {
          throw error;
        }

        this.remove(id);

        return;
      },

      async deleteMany(ids: Row['id'][]) {
        const { data: items, error } = await table().delete().in('id', ids).select('*');

        if (items?.length !== ids.length) {
          throw new Error(`Could not delete all. Perhaps a problem with RLS?`);
        }

        if (error) {
          throw error;
        }

        ids.forEach(id => delete (this as any)[tableName][id]);
      },

      async insert(data: Insert) {
        const { data: items, error } = await table().insert(data as any).select('*');

        if (error) {
          throw error;
        }

        if (!items?.[0]) {
          throw new Error(`Could not insert into ${tableName}. Perhaps a problem with RLS?`);
        }

        return this.add(items as Row[])[0];
      },

      // Handles data saving: creates a new entry if ID is new or not present, otherwise updates the existing entry.
      async save(data: Insert | Update) {
        const _data = { ...data };
        if (relations) {
          Object.entries(relations).forEach(([relationName, storeDef]) => {
            delete _data[storeDef.tableName];
            delete _data[relationName];
          });
        }

        if ((_data.id as string)?.startsWith?.('_new')) {
          delete _data.id;
        }

        if (_data.id) {
          return this.update(_data.id as any, _data);
        }

        return this.insert(_data);
      },

      async query(cb: (filterBuilder: FilterBuilder) => FilterBuilder, options?: SelectOptions) {
        const key = options?.include ? this.getKey('*', options) : '*';
        const { data, error } = await cb(table().select(key as '*'));
        if (error) {
          throw error;
        }

        return this.add(data as any[]);
      },

      async find(id: Row['id'], options?: { reload?: boolean }) {
        const localEntity = (this as any)[tableName][id];
        if (localEntity && !options?.reload) {
          return localEntity as Row;
        }

        const { data, error } = await table().select('*').eq('id', id as any);

        if (error) {
          throw error;
        }

        if (!data[0]) {
          throw new Error(`Could not find ${tableName}:${id}`);
        }

        this.add(data as Row[]);
        return data[0];
      },

      peek(id: Row['id']) {
        return (this as any)[tableName][id] as Row | undefined;
      },

      peekAll() {
        return Object.values((this as any)[tableName]) as Row[];
      },

      subscribe() {

        if ((this as any)['_subscribed']) {
          console.warn(`Already subscribed to ${tableName}`);
          return;
        }

        (this as any)['_channel'] = supabase.channel(tableName)
          .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, (payload) => {

            if (payload.eventType === 'DELETE') {
              delete (this as any)[tableName][payload.old.id];
            }

            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              this.add([payload.new]);
            }
          }).subscribe();
      },

      unsubscribe() {
        if ((this as any)['_subscribed']) {
          ((this as any)['_channel'] as RealtimeChannel)?.unsubscribe();
        } else {
          console.warn('Not subscribed to', tableName);
        }
      }
    }
  });

  (storeDefinition as any).tableName = tableName;
  return storeDefinition as typeof storeDefinition & { tableName: TableName };
}

export type SupaStoreDefinition = ReturnType<typeof defineSupaStore>;
export type SupaStore = ReturnType<ReturnType<typeof defineSupaStore>>;
