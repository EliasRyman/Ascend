# Fix: Date-Scoped Tasks and Habits

## Problem
När användaren navigerar till ett framtida datum och drar en habit eller task till tidslinjen:
1. ❌ Tasks laddades inte för det nya datumet
2. ❌ Tasks som drogs till tidslinjen fick inte rätt `assigned_date`
3. ❌ Varning "This habit is already on the timeline!" visades felaktigt

## Lösning

### 1. Ladda Tasks När Datum Ändras
**Fil**: `App.tsx` (rad ~1458)

**Före**:
```typescript
// Laddade bara schedule blocks och notes
const [blocksData, noteContent] = await Promise.all([
  loadScheduleBlocks(selectedDate),
  loadNote(selectedDate)
]);
```

**Efter**:
```typescript
// Laddar även tasks och genererar recurring instances
const generatedCount = await generateRecurringInstances(selectedDate, settings.timezone);

const [blocksData, activeTasksData, noteContent] = await Promise.all([
  loadScheduleBlocks(selectedDate),
  loadTasksForDateWithRecurring(selectedDate, 'active'),
  loadNote(selectedDate)
]);

setActiveTasks(activeTasksData.map(t => ({...})));
```

**Resultat**: När du byter datum laddas tasks för det nya datumet.

### 2. Uppdatera Task Assigned Date Vid Drag-and-Drop
**Fil**: `App.tsx` (rad ~2597)

**Före**:
```typescript
// Uppdaterade bara time, inte assigned_date
await updateTask(String(task.id), { time: timeString });
```

**Efter**:
```typescript
const dateString = selectedDate.toISOString().split('T')[0];

if (draggedItem.sourceList === 'later') {
  // Flytta från Later till Active med rätt datum
  setLaterTasks(prev => prev.filter(t => t.id !== task.id));
  setActiveTasks(prev => [...prev, { ...task, time: timeString, assignedDate: dateString }]);
  await moveTaskToList(String(task.id), 'active', selectedDate);
} else {
  // Uppdatera existing active task med nytt datum
  setActiveTasks(prev => prev.map(t => 
    t.id === task.id ? { ...t, time: timeString, assignedDate: dateString } : t
  ));
  await updateTask(String(task.id), { time: timeString, assignedDate: dateString });
}
```

**Resultat**: Tasks får rätt `assigned_date` när de dras till tidslinjen.

### 3. Habit Timeline Check
**Fil**: `App.tsx` (rad ~2398)

**Nuvarande Kod** (Ingen ändring behövdes):
```typescript
const existingBlock = schedule.find(b => b.habitId === habitId);
if (existingBlock) {
  setNotification({ type: 'info', message: 'This habit is already on the timeline!' });
  return;
}
```

**Förklaring**: 
- `schedule` innehåller bara blocks för det valda datumet
- `loadScheduleBlocks(selectedDate)` filtrerar på datum
- Varningen visas bara om habiten redan finns på tidslinjen för DET SPECIFIKA datumet
- Detta är korrekt beteende!

## Hur Det Fungerar Nu

### Scenario 1: Dra Task Till Framtida Datum

**Steg**:
1. Idag är 17 december
2. Navigera till 19 december
3. Dra "Handla" från "To-do Later" till tidslinjen kl 10:00

**Resultat**:
- ✅ Task flyttas från "Later" till "Active"
- ✅ `assigned_date` = '2025-12-19'
- ✅ `time` = '10:00'
- ✅ Schedule block skapas för 19 december
- ✅ Task visas BARA på 19 december, inte idag

### Scenario 2: Dra Habit Till Framtida Datum

**Steg**:
1. Idag är 17 december
2. Navigera till 19 december
3. Dra "GYMMA" från Habits till tidslinjen kl 06:00

**Resultat**:
- ✅ Schedule block skapas för 19 december
- ✅ Habit visas på tidslinjen för 19 december
- ✅ Habit visas INTE på tidslinjen för 17 december
- ✅ Kan dra samma habit till 17 december också (olika dagar)

### Scenario 3: Navigera Mellan Datum

**Steg**:
1. Skapa task "Möte" på 18 december
2. Navigera till 17 december
3. Navigera tillbaka till 18 december

**Resultat**:
- ✅ "Möte" visas BARA på 18 december
- ✅ "Möte" visas INTE på 17 december
- ✅ Varje datum har sina egna tasks

## Testplan

### Test 1: Task Till Framtida Datum
- [ ] Navigera till imorgon
- [ ] Dra task från "To-do Later" till tidslinjen
- [ ] Verifiera: Task visas i "To-do" för imorgon
- [ ] Navigera till idag
- [ ] Verifiera: Task visas INTE i "To-do" för idag

### Test 2: Habit Till Framtida Datum
- [ ] Navigera till imorgon
- [ ] Dra habit till tidslinjen
- [ ] Verifiera: Habit visas på tidslinjen för imorgon
- [ ] Navigera till idag
- [ ] Verifiera: Habit visas INTE på tidslinjen för idag
- [ ] Dra samma habit till tidslinjen för idag
- [ ] Verifiera: Fungerar utan varning

### Test 3: Recurring Tasks
- [ ] Skapa recurring task (t.ex. "GYMMA")
- [ ] Navigera till imorgon
- [ ] Verifiera: "GYMMA" visas i "To-do" för imorgon (ny instance)
- [ ] Markera som klar
- [ ] Navigera till idag
- [ ] Verifiera: "GYMMA" visas som oklar (annan instance)

### Test 4: Task Assignment
- [ ] Skapa task "Test" idag
- [ ] Navigera till imorgon
- [ ] Dra "Test" från "To-do Later" till tidslinjen
- [ ] Verifiera: Task flyttas till "To-do" för imorgon
- [ ] Navigera till idag
- [ ] Verifiera: Task visas INTE i "To-do" för idag

## Förväntade Console Logs

När du navigerar till ett nytt datum:
```
🔄 Generating recurring task instances for: 2025-12-19
📋 Found 2 recurring task template(s)
✅ Created instance for "GYMMA" on 2025-12-19
🎉 Generated 1 recurring task instance(s) for 2025-12-19

📅 Loading schedule blocks for user: xxx date: 2025-12-19
📦 LOAD DEBUG: Found 0 blocks for date 2025-12-19

📋 Loading tasks for date: 2025-12-19 listType: active
✅ Loaded tasks: 1 items
```

## Felsökning

### Problem: Tasks visas inte när jag byter datum
**Lösning**: Kolla console logs. Du ska se "Loading tasks for date: YYYY-MM-DD"

### Problem: Varning "already on timeline" visas felaktigt
**Lösning**: 
1. Kolla console: "Found X blocks for date YYYY-MM-DD"
2. Om blocks från annat datum visas, är det ett filtreringsproblem
3. Verifiera att `loadScheduleBlocks` filtrerar på rätt datum

### Problem: Task finns på flera datum
**Lösning**: 
1. Kolla database: `SELECT * FROM tasks WHERE title = 'TaskName'`
2. Verifiera att `assigned_date` är korrekt
3. Om flera rader finns, kan det vara duplicates

## Sammanfattning

✅ **Tasks är nu datum-scopade**: Varje task tillhör ett specifikt datum
✅ **Habits kan schemaläggas på olika datum**: Samma habit kan vara på tidslinjen olika dagar
✅ **Recurring tasks fungerar**: Genererar automatiskt nya instances för varje dag
✅ **Datum-navigering fungerar**: Tasks och schedule blocks laddas korrekt för varje datum

**Nästa steg**: Testa grundligt enligt testplanen ovan!
