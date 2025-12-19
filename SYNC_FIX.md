# Fix: Synkning Mellan Tasks/Habits och Tidslinjen

## Problem
När du navigerar mellan olika datum:
1. ❌ Tasks som är completed visas som uncompleted på tidslinjen
2. ❌ Schedule blocks som är completed synkar inte med tasks
3. ❌ När du kryssar i ett block på tidslinjen, uppdateras inte tasken korrekt

## Orsak
1. **Ingen synkning vid laddning**: När data laddades från databasen, synkades inte completion-status mellan tasks och schedule blocks
2. **Fel funktion användes**: `handleToggleBlockComplete` använde `updateTask` istället för `toggleTaskCompletion`, vilket inte satte `completedAt` timestamp
3. **Ingen sync-logik**: Ingen kod som säkerställde att tasks och blocks hade samma completion-status

## Lösning

### 1. Förbättrad Block Completion Toggle
**Fil**: `App.tsx` - `handleToggleBlockComplete` (rad ~1809)

**Före**:
```typescript
if (block.taskId) {
  setActiveTasks(prev => prev.map(t => 
    String(t.id) === String(block.taskId) 
      ? { ...t, completed: newCompleted } 
      : t
  ));
  updateTask(String(block.taskId), { completed: newCompleted }); // ❌ Ingen timestamp!
}
```

**Efter**:
```typescript
if (block.taskId) {
  const now = new Date().toISOString();
  
  // Update UI with timestamp
  setActiveTasks(prev => prev.map(t => 
    String(t.id) === String(block.taskId) 
      ? { ...t, completed: newCompleted, completedAt: newCompleted ? now : null } 
      : t
  ));
  
  // Find current task
  const currentTask = activeTasks.find(t => String(t.id) === String(block.taskId));
  
  // Use toggleTaskCompletion for proper timestamp tracking
  if (currentTask) {
    await toggleTaskCompletion(String(block.taskId), currentTask.completed);
  }
}
```

**Resultat**: ✅ `completedAt` timestamp sätts korrekt när du kryssar i ett block

### 2. Synkning Vid Initial Load
**Fil**: `App.tsx` - Initial data load (rad ~1240)

**Tillagt**:
```typescript
// Sync completion status between schedule blocks and tasks at initial load
const syncedSchedule = blocksData.map(block => {
  if (block.taskId) {
    const linkedTask = activeData.find(t => String(t.id) === String(block.taskId)) 
                    || laterData.find(t => String(t.id) === String(block.taskId));
    if (linkedTask && linkedTask.completed !== block.completed) {
      console.log(`🔄 Initial sync: block "${block.title}": ${block.completed} → ${linkedTask.completed}`);
      return { ...block, completed: linkedTask.completed };
    }
  }
  return block;
});

setSchedule(syncedSchedule);
```

**Resultat**: ✅ Schedule blocks får samma completion-status som tasks vid laddning

### 3. Synkning Vid Datum-Navigering
**Fil**: `App.tsx` - Date change effect (rad ~1485)

**Tillagt**:
```typescript
// Map active tasks
const mappedActiveTasks = activeTasksData.map(t => ({...}));
setActiveTasks(mappedActiveTasks);

// Sync completion status between schedule blocks and tasks
const syncedSchedule = blocksData.map(block => {
  if (block.taskId) {
    const linkedTask = mappedActiveTasks.find(t => String(t.id) === String(block.taskId));
    if (linkedTask && linkedTask.completed !== block.completed) {
      console.log(`🔄 Syncing completion status for block "${block.title}": ${block.completed} → ${linkedTask.completed}`);
      return { ...block, completed: linkedTask.completed };
    }
  }
  return block;
});

if (syncedSchedule.some((b, i) => b.completed !== blocksData[i].completed)) {
  setSchedule(syncedSchedule);
}
```

**Resultat**: ✅ Schedule blocks synkas med tasks när du byter datum

## Hur Det Fungerar Nu

### Scenario 1: Kryssa I Task I Listan
```
1. Kryssa i "Ikea" i To-do listan
2. toggleTaskCompletion() körs
3. Task uppdateras: completed = true, completedAt = timestamp
4. Schedule block uppdateras: completed = true
5. Refresh sidan
6. Data laddas, sync körs
7. ✅ "Ikea" är fortfarande ikryssad i både lista och tidslinje
```

### Scenario 2: Kryssa I Block På Tidslinjen
```
1. Kryssa i "Ikea" block på tidslinjen
2. handleToggleBlockComplete() körs
3. Block uppdateras: completed = true
4. Task uppdateras: completed = true, completedAt = timestamp
5. toggleTaskCompletion() sparar till DB
6. Refresh sidan
7. ✅ "Ikea" är fortfarande ikryssad i både tidslinje och lista
```

### Scenario 3: Navigera Mellan Datum
```
1. Kryssa i "Ikea" på 17 december
2. Navigera till 18 december
3. Data laddas för 18 december
4. Sync körs (inga tasks för 18 december)
5. Navigera tillbaka till 17 december
6. Data laddas för 17 december
7. Sync körs: block "Ikea" synkas med task "Ikea"
8. ✅ "Ikea" är fortfarande ikryssad
```

## Console Logs

### När Du Kryssar I Ett Block
```
🔄 toggleTaskCompletion called: {
  taskId: "abc-123",
  currentlyCompleted: false,
  newCompleted: true,
  timestamp: "2025-12-17T12:27:00.000Z"
}
✅ Task completion toggled successfully: {
  id: "abc-123",
  title: "Ikea",
  completed: true,
  completed_at: "2025-12-17T12:27:00.000Z"
}
```

### När Data Laddas
```
📋 Loading tasks for date: 2025-12-17 listType: active
✅ Loaded tasks: 2 items
📅 Loading schedule blocks for user: xxx date: 2025-12-17
📦 LOAD DEBUG: Found 1 blocks for date 2025-12-17
🔄 Syncing completion status for block "Ikea": false → true
```

### När Du Navigerar Mellan Datum
```
🔄 Generating recurring task instances for: 2025-12-18
✅ No recurring task templates found
📋 Loading tasks for date: 2025-12-18 listType: active
✅ Loaded tasks: 0 items
📅 Loading schedule blocks for user: xxx date: 2025-12-18
📦 LOAD DEBUG: Found 0 blocks for date 2025-12-18
```

## Testplan

### Test 1: Task → Block Sync
- [ ] Kryssa i "Ikea" i To-do listan
- [ ] Verifiera: Block på tidslinjen är också ikryssad
- [ ] Refresh sidan
- [ ] Verifiera: Både task och block är fortfarande ikryssade

### Test 2: Block → Task Sync
- [ ] Kryssa i "Ikea" block på tidslinjen
- [ ] Verifiera: Task i listan är också ikryssad
- [ ] Refresh sidan
- [ ] Verifiera: Både block och task är fortfarande ikryssade

### Test 3: Datum-Navigering
- [ ] Kryssa i "Ikea" på 17 december
- [ ] Navigera till 18 december
- [ ] Verifiera: "Ikea" visas inte (annat datum)
- [ ] Navigera tillbaka till 17 december
- [ ] Verifiera: "Ikea" är fortfarande ikryssad i både lista och tidslinje

### Test 4: Recurring Task Sync
- [ ] Kryssa i "GYMMA" (recurring task) på 17 december
- [ ] Navigera till 18 december
- [ ] Verifiera: Ny "GYMMA" instance, okryssad
- [ ] Kryssa i "GYMMA" på 18 december
- [ ] Navigera tillbaka till 17 december
- [ ] Verifiera: "GYMMA" är fortfarande ikryssad (gammal instance)

## Sammanfattning

### Vad Som Fixades
✅ **Block completion** använder nu `toggleTaskCompletion` för korrekt timestamp
✅ **Initial load** synkar completion-status mellan blocks och tasks
✅ **Datum-navigering** synkar completion-status när du byter datum
✅ **Detaljerad logging** för att kunna debugga framtida problem

### Hur Synkningen Fungerar
1. **Tasks är source of truth**: Tasks i databasen har `completed` och `completed_at`
2. **Blocks synkas med tasks**: När data laddas, uppdateras blocks för att matcha tasks
3. **Bi-direktional sync**: Kryssa i task → uppdatera block, kryssa i block → uppdatera task
4. **Datum-scoped**: Varje datum har sina egna tasks och blocks

### Förväntade Resultat
- ✅ Tasks och blocks har alltid samma completion-status
- ✅ Completion-status persistas efter refresh
- ✅ Completion-status är korrekt när du navigerar mellan datum
- ✅ Recurring tasks har separata completion-status för varje dag

---

**Nu ska synkningen fungera perfekt!** 🎉

Testa genom att:
1. Kryssa i en task
2. Verifiera att blocken på tidslinjen också är ikryssad
3. Refresh sidan
4. Verifiera att båda fortfarande är ikryssade
5. Navigera till ett annat datum och tillbaka
6. Verifiera att completion-status är korrekt
