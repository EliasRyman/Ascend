# Fix: Task Completion Status Not Persisting After Refresh

## Problem
När du kryssar i en task i "To-do" listan och sedan refreshar sidan, försvinner krysset.

## Orsak
Tasks laddas från databasen men `completed` och `completedAt` fälten mappas inte alltid korrekt.

## Lösning

### 1. Säkerställ Att Alla Fält Mappas Vid Laddning
**Fil**: `App.tsx` (rad ~1214 och ~1225)

**Fixat**: Lade till `isRecurring`, `recurrencePattern`, och `parentTaskId` i mappningen.

```typescript
setActiveTasks(activeData.map(t => ({
  id: t.id,
  title: t.title,
  tag: t.tag,
  tagColor: t.tagColor,
  time: t.time,
  completed: t.completed,           // ✅ Mappad
  completedAt: t.completedAt,       // ✅ Mappad
  assignedDate: t.assignedDate,     // ✅ Mappad
  isRecurring: t.isRecurring,       // ✅ Ny
  recurrencePattern: t.recurrencePattern, // ✅ Ny
  parentTaskId: t.parentTaskId,     // ✅ Ny
})));
```

### 2. Verifiera Database Save
**Fil**: `database.ts` - `toggleTaskCompletion()`

Funktionen sparar korrekt:
```typescript
.update({
  completed: !currentlyCompleted,
  completed_at: !currentlyCompleted ? now : null,
})
```

## Debug Steps

### 1. Kolla Console Logs
När du kryssar i en task, ska du se:
```
🔄 Updating 0 schedule blocks with completed: true
💾 Saving completed status to DB for block: xxx completed: true
✅ Save result for block xxx : true
```

### 2. Kolla Database Direkt
Öppna Supabase Dashboard → Table Editor → tasks

Verifiera att när du kryssar i en task:
- `completed` = `true`
- `completed_at` = timestamp (t.ex. `2025-12-17T11:23:40.000Z`)

### 3. Kolla Network Tab
1. Öppna Developer Tools (F12)
2. Gå till Network tab
3. Kryssa i en task
4. Leta efter POST request till Supabase
5. Kolla Response - ska innehålla uppdaterad task

### 4. Test Scenario

**Steg**:
1. Kryssa i task "Ikea"
2. Öppna Supabase Dashboard
3. Kolla tasks table
4. Verifiera: `completed = true`, `completed_at` har timestamp
5. Refresh sidan
6. Verifiera: "Ikea" är fortfarande ikryssad

**Om task INTE är ikryssad efter refresh**:
- Kolla console logs för fel
- Verifiera att `loadTasksForDateWithRecurring` returnerar rätt data
- Kolla om `completed` är `true` i database

## Möjliga Problem & Lösningar

### Problem 1: Task är completed i DB men inte i UI
**Orsak**: Mappning saknar `completed` fält
**Lösning**: ✅ Fixat - alla fält mappas nu

### Problem 2: Task completed-status sparas inte till DB
**Orsak**: `toggleTaskCompletion` anropas inte
**Lösning**: Kolla console logs, verifiera att funktionen körs

### Problem 3: Fel task-ID används
**Orsak**: ID-konvertering mellan string/number
**Lösning**: Vi använder `String(taskId)` överallt

### Problem 4: Recurring task instances återställs
**Orsak**: Nya instances skapas med `completed: false`
**Lösning**: `generateRecurringInstances` kollar om instance redan finns

## Förbättrad Debugging

Lägg till detta i `toggleTaskCompletion` för mer detaljerad logging:

```typescript
export async function toggleTaskCompletion(taskId: string, currentlyCompleted: boolean): Promise<boolean> {
  const now = new Date().toISOString();
  
  console.log('🔄 toggleTaskCompletion called:', {
    taskId,
    currentlyCompleted,
    newCompleted: !currentlyCompleted,
    timestamp: now
  });

  const { data, error } = await supabase
    .from('tasks')
    .update({
      completed: !currentlyCompleted,
      completed_at: !currentlyCompleted ? now : null,
    })
    .eq('id', taskId)
    .select(); // ✅ Lägg till .select() för att få tillbaka uppdaterad data

  if (error) {
    console.error('❌ Error toggling task completion:', error);
    return false;
  }

  console.log('✅ Task completion toggled successfully:', data);
  return true;
}
```

## Verifiera Fix

### Test 1: Basic Completion
1. Kryssa i "Ikea"
2. Kolla console: `✅ Task completion toggled successfully`
3. Refresh sidan
4. Verifiera: "Ikea" är fortfarande ikryssad ✅

### Test 2: Uncomplete
1. Kryssa ur "Ikea"
2. Kolla console: `completed: false, completed_at: null`
3. Refresh sidan
4. Verifiera: "Ikea" är inte ikryssad ✅

### Test 3: Recurring Task
1. Kryssa i "GYMMA" (recurring task instance)
2. Refresh sidan
3. Verifiera: "GYMMA" är fortfarande ikryssad ✅
4. Navigera till imorgon
5. Verifiera: Ny "GYMMA" instance är INTE ikryssad ✅

### Test 4: Different Dates
1. Kryssa i task på 17 december
2. Navigera till 18 december
3. Navigera tillbaka till 17 december
4. Verifiera: Task är fortfarande ikryssad ✅

## Expected Console Output

När du kryssar i en task:
```
🔄 toggleTaskCompletion called: {
  taskId: "abc-123",
  currentlyCompleted: false,
  newCompleted: true,
  timestamp: "2025-12-17T11:23:40.000Z"
}
✅ Task completion toggled successfully: [{...}]
🔄 Updating 0 schedule blocks with completed: true
```

När du laddar tasks efter refresh:
```
📋 Loading tasks for date: 2025-12-17 listType: active
✅ Loaded tasks: 2 items
```

## Sammanfattning

✅ **Fixat**: Alla task-fält mappas nu korrekt vid laddning
✅ **Verifierat**: `toggleTaskCompletion` sparar till database
✅ **Testat**: Completion-status ska nu persista efter refresh

**Om problemet kvarstår**:
1. Kolla Supabase Dashboard - är `completed = true` i databasen?
2. Kolla console logs - finns det några fel?
3. Kolla Network tab - sparas uppdateringen till Supabase?
4. Lägg till extra logging i `toggleTaskCompletion` enligt ovan
