Vue Supabase Pinia Integration
==============================

This library provides a seamless integration of Supabase with Pinia for Vue applications, enabling efficient and type-safe data management practices. It leverages the power of Supabase for backend operations and Pinia for state management, offering a robust solution for handling complex data structures and relationships.

Features
--------

-   TypeScript Support: Full TypeScript support ensures type safety and enhances development experience with autocompletion and compile-time error checking.
-   Dynamic Data Modeling: Easily model your database schema within your Vue application, allowing for flexible and dynamic data interaction.
-   Comprehensive CRUD Operations: Out-of-the-box support for create, read, update, and delete operations, along with querying.
-   Efficient State Management: Leverages Pinia for reactive state management, ensuring your UI stays in sync with your database state.
-   Relationship Handling: Supports defining and managing relationships between different entities in your database.

Installation
------------

Before installing, ensure you have a Vue project set up with Pinia and Supabase-js installed.

```
npm install @supabase/supabase-js pinia
```

Install the library

```
npm install pinia-supabase
```

Usage
-----

1.  Define Your Store: Use `defineSupaStore` to create a new store tailored to your Supabase table and schema.

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

// Unsubscribe from table changes
yourSupaStore.unsubscribe();
```
