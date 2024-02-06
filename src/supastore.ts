import { SupabaseClient } from "@supabase/supabase-js";
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
        [tableName]: {},
      } as { [K in TableName]: Record<string, Row> };
      return state;
    },

    actions: {
      add(entities: Row[]) {
        const otherStores = relations ? Object.values(relations).map(useStore => useStore()) : [];

        return entities.map(entity => {
          const proxy = (this as any)[tableName][(entity as any).id] = entity;
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

      getKey(key: '*' | undefined, options: SelectOptions) {
        let _key: string = key || '*';
        if (options?.include && relations) {
          _key = [_key, ...options.include.map(key => `${(relations[key] as any).tableName as string}(*)`)].join(',');
        }

        return _key;
      },

      async select(key: '*' | undefined, options?: SelectOptions): Promise<Row[]> {
        const _key = options?.include ? this.getKey(key, options) : key;
        const cacheKey = `_loaded-${key}`;

        if (this[cacheKey]) {
          return Object.values(this[tableName as any] as Row[]);
        }

        const { data, error } = await table().select(_key as '*');
        if (error) {
          throw error;
        }

        this[cacheKey] = true;

        return this.add(data);
      },

      async update(id: Row['id'], data: Partial<Update>) {
        const { data: items, error } = await table().update(data as any).eq('id', id).select('*');

        if (error) {
          throw error;
        }

        const [item] = items;

        if (!item) {
          throw new Error(`Could not save ${tableName}:${id}. Perhaps a problem with RLS?`);
        }

        Object.assign(this[tableName as any][id], item);

        return this[tableName as any][id] as Row;
      },

      async delete(id: Row['id']) {
        const { data: items, error } = await table().delete().eq('id', id).select('*');

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

        delete this[tableName as any][id];

        return;
      },

      async insert(data: Insert) {
        const { data: items, error } = await table().insert(data as any).select('*');

        if (error) {
          throw error;
        }

        if (!items?.[0]) {
          throw new Error(`Could not insert into ${tableName}. Perhaps a problem with RLS?`);
        }

        return this.add(items)[0];
      },

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
        const localEntity = this[tableName as any][id];
        if (localEntity && !options?.reload) {
          return localEntity as Row;
        }

        const { data, error } = await table().select('*').eq('id', id);

        if (error) {
          throw error;
        }

        if (!data[0]) {
          throw new Error(`Could not find ${tableName}:${id}`);
        }

        return data[0];
      },

      peek(id: Row['id']) {
        return this[tableName as any][id] as Row | undefined;
      },

      peekAll(): Row[] {
        return Object.values(this[tableName as any]) as Row[];
      }
    }
  });

  (storeDefinition as any).tableName = tableName;
  return storeDefinition as typeof storeDefinition & { tableName: TableName };
}

export type SupaStoreDefinition = ReturnType<typeof defineSupaStore>;
export type SupaStore = ReturnType<ReturnType<typeof defineSupaStore>>;
