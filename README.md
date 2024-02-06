supabase-pinia (experimental, alpha)
==============================

Make your Supabase tables reactive.
Create a pinia store for your supabase table, with CRUD actions that sync local and remote state. 

Features
--------

-   **TypeScript Support**: Assuming your supabase client is typed, `SupaStore` should respect and further propagate these types
-   **CRUD Operations**: create, read, update, and delete operations, along with querying.
-   **State Management**: Leverages Pinia for reactive state management, ensuring your UI stays in sync with your database state.
-   **Basic ORM (WIP)**: Supports defining and managing relationships between different entities in your database.

Installation
------------

Before installing, ensure you have a Vue project set up with Pinia and Supabase-js installed.

```bash
npm install @supabase/supabase-js pinia
```

Install the library

```bash
npm install pinia-supabase
```

Usage
-----

1.  Define Your Store: Use `defineSupaStore` to create a new store tailored to your Supabase table and schema. Each pinia store represents just one table. Your can use these stores directly in components or you can use them in your own pinia stores.

```ts
import { defineSupaStore } from 'pinia-supabase';
import { supabase } from './supabaseClient'; // Your Supabase client instance

const useYourStore = defineSupaStore({
  supabase,
  tableName: 'your_table_name',
  // Define relationships if necessary
});

export default useYourStore;
```

2. Interacting with your store

```vue
<script setup>
import { useYourStore } from '@/stores/yourStore';
import { computed } from 'vue';

const store = useYourStore();

// Fetch items
store.select('*');
const allItems = computed(() => store.peekAll())
</script>
```

### Store Actions

```ts
// Define your Supabase-Pinia store for a specific table
const yourSupaStore = defineSupaStore(supabase, 'yourTableName');

// Adding entities to the store
// If the entity already exists, it's updated
yourSupaStore.add([
  // Array of entities to add
]);

// Selecting data from the table, including related entities if needed
yourSupaStore.select('*', { include: ['relatedTableName'] }).then((entities) => {
  console.log(entities);
});

// Updating an entity in the store and the Supabase table
yourSupaStore.update('entityId', {
  // Partial update data
}).then((updatedEntity) => {
  console.log(updatedEntity);
});

// Update multiple entities by IDs
yourSupaStore.updateMany(['entityId1', 'entityId2'], {
  // Update data
});

// Deleting an entity from the store and the Supabase table
yourSupaStore.delete('entityId').then(() => {
  console.log('Entity deleted');
});

// Delete multiple entities by IDs
yourSupaStore.deleteMany(['entityId1', 'entityId2']);

// Inserting a new entity into the store and the Supabase table
yourSupaStore.insert({
  // New entity data
}).then((newEntity) => {
  console.log(newEntity);
});

// Saving an entity to the store and the Supabase table, auto deciding between insert and update
yourSupaStore.save({
  // Entity data with or without an id
}).then((savedEntity) => {
  console.log(savedEntity);
});

// Executing a custom query on the Supabase table
yourSupaStore.query((queryBuilder) => {
  return queryBuilder.eq('columnName', 'value');
}, { include: ['relatedTableName'] }).then((queriedEntities) => {
  console.log(queriedEntities);
});

// If present, get entity from the local store, if not, fetch it from the server. Reload: true means you want to always fetch from the server and get latest data
yourSupaStore.find('entityId', { reload: true }).then((foundEntity) => {
  console.log(foundEntity);
});

// Peeking at an entity in the store by ID without making request to server
console.log(yourSupaStore.peek('entityId'));

// Returning all entities currently in the store, without making request to server
console.log(yourSupaStore.peekAll());

// Subscribe to table changes for realtime updates
yourSupaStore.subscribe();

// Unsubscribe from table changes. Make sure to call this on unmount.
yourSupaStore.unsubscribe();
```

## Store relations (WIP)

```ts
// Define stores with relations
const useProjectStore = defineSupaStore(supabase, 'projects');
const useUserStore = defineSupaStore(supabase, 'users', {
  projects: useProjectsStore,
});

// Fetch data with related entities
const userStore = useUserStore();
const projectStore = useProjectStore();
userStore.select('*', { include: ['projects'] }).then((users) => {
  users.forEach(user => {
    console.log(user.projects); // projects are present on the user entity, but the TS support for this is lacking so far
    // projects are added to the project store too
    console.log(projectStore.peekAll().filter(project => project.user_id === user.id));
  });
});
```

## TODO

- [x] Basic CRUD operations
- [x] Syncing state to the store
- [x] Basic TS support
- [ ] Proper unit tests
- [ ] Including related entities (almost there)
- [ ] Proper TS support for related entities
