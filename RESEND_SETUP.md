# Resend Integration - Quick Reference

## 📁 Filer som skapades

### Edge Function
- **Plats**: `supabase/functions/send-welcome-email/index.ts`
- **Syfte**: Skickar välkomstmail via Resend API
- **Deploy**: Via Supabase Dashboard → Edge Functions

### SQL Migrations
1. **`supabase/migrations/20260119_welcome_email_trigger.sql`**
   - Skapar database trigger som körs vid ny användare
   - Anropar Edge Function automatiskt
   - ⚠️ **OBS**: Uppdatera `YOUR_PROJECT_REF` innan deploy!

2. **`supabase/migrations/20260119_email_subscribers.sql`** (Valfri)
   - Skapar tabell för att bygga e-postlista
   - Perfekt för framtida marknadsföring
   - Lägger automatiskt till nya användare

---

## 🔑 Miljövariabler

**Edge Function Secret** (Lägg till i Supabase Dashboard):
```
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

❌ **Lägg INTE till i `.env` eller `.env.local`** - detta är en backend-secret!

---

## 🚀 Deploy-checklista

- [ ] 1. Skapa Resend-konto på [resend.com](https://resend.com)
- [ ] 2. Hämta API-nyckel från Resend Dashboard
- [ ] 3. Deploya Edge Function i Supabase Dashboard  
- [ ] 4. Lägg till `RESEND_API_KEY` i Edge Function secrets
- [ ] 5. Uppdatera `YOUR_PROJECT_REF` i SQL-migrationen
- [ ] 6. Kör SQL-migration i Supabase SQL Editor
- [ ] 7. Testa genom att registrera ny användare

---

## 📊 SQL Queries för övervakning

### Kontrollera skickade mail
```sql
select * from public.welcome_emails_log 
order by sent_at desc 
limit 20;
```

### Se alla subscribers (om tabell finns)
```sql
select email, subscribed_at 
from public.email_subscribers 
where is_active = true
order by subscribed_at desc;
```

### Räkna totalt antal subscribers
```sql
select count(*) as total 
from public.email_subscribers 
where is_active = true;
```

---

## 🔧 Felsökning

### Mail kommer inte fram?

1. **Kolla spam-folder**
2. **Resend Dashboard** → Emails → Se om mailet skickades
3. **Supabase Logs** → Edge Functions → `send-welcome-email`
4. **Database logs**:
   ```sql
   select * from public.welcome_emails_log where success = false;
   ```

### Edge Function error?

Kolla Supabase logs för error messages. Vanliga problem:
- `RESEND_API_KEY` inte satt
- Felaktig API-nyckel
- Resend rate limit (100/dag på gratis tier)

---

## 📧 Anpassa mailet

**Ändra avsändare:**
```typescript
from: 'Ascend <onboarding@resend.dev>', // Test-domän
// eller
from: 'Ascend <hello@dindomän.se>',    // Egen domän (kräver verifiering)
```

**Ändra innehåll:**
- Redigera HTML i `index.ts`
- Deploy om i Supabase Dashboard

---

## 💰 Kostnad & Limits

**Resend Gratis Tier:**
- 3,000 e-post/månad
- 100 e-post/dag
- Obegränsad API requests

**Supabase Edge Functions:**
- 500,000 invocations/månad (gratis)

**Total kostnad: 0 kr/månad** för normal användning! 🎉

---

## 📚 Dokumentation

- **Resend Docs**: [resend.com/docs](https://resend.com/docs)
- **Supabase Edge Functions**: [supabase.com/docs/guides/functions](https://supabase.com/docs/guides/functions)
- **Deployment Guide**: Se `deployment_guide.md` för fullständig guide

---

## ✨ Framtida förbättringar

- [ ] A/B-testa olika subject lines
- [ ] Lägg till användarens namn i mailet
- [ ] Skapa onboarding-sekvens (dag 3, dag 7 mail)
- [ ] Integrera med Resend Audiences
- [ ] Lägg till unsubscribe-länk
- [ ] Skicka månatliga sammanfattningar
