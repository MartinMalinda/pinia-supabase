Vue Supabase Pinia Integration
==============================

This library provides a seamless integration of Supabase with Pinia for Vue applications, enabling efficient and type-safe data management practices. It leverages the power of Supabase for backend operations and Pinia for state management, offering a robust solution for handling complex data structures and relationships.

Features
--------

-   TypeScript Support: Full TypeScript support ensures type safety and enhances development experience with autocompletion and compile-time error checking.
-   Dynamic Data Modeling: Easily model your database schema within your Vue application, allowing for flexible and dynamic data interaction.
-   Comprehensive CRUD Operations: Out-of-the-box support for create, read, update, and delete operations, along with advanced querying capabilities.
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

Actions available on stores created by `defineSupaStore`.

#### add(entities: Row[])

Adds entities to the store and updates related entities based on defined relations.

#### select(key: '*' | undefined, options?: SelectOptions)

Selects data from the table, optionally including related entities.

#### update(id: Row['id'], data: Partial<Update>)

Updates an entity in the store and the corresponding Supabase table entry.

#### delete(id: Row['id'])

Deletes an entity from the store and the Supabase table.

#### insert(data: Insert)

Inserts a new entity into the store and the Supabase table.

#### save(data: Insert | Update)

Saves an entity to the store and the Supabase table, choosing between insert and update operations automatically.

#### query(cb: (filterBuilder: FilterBuilder) => FilterBuilder, options?: SelectOptions)

Executes a custom query on the Supabase table. All entities are added to the store.

#### find(id: Row['id'], options?: { reload?: boolean })

First, the entity is looked up from the store. If not present, it's fetched from Supabase.

#### peek(id: Row['id'])

Returns entity from the store, does not create a request to Supabase

#### peekAll()

Returns all entities currently in the store. No request to Supabase is made.
