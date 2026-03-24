# CLAUDE.md — voxena-dashboard

## Ce que c'est
Dashboard de gestion des commandes pour les restaurants utilisant Voxena (agent vocal IA).
Deux interfaces : un dashboard restaurant (owner) et un super admin Voxena.

## Stack
- **Next.js 15** + React 19 + TypeScript + Tailwind v4 + shadcn/ui
- **Supabase** : PostgreSQL + Realtime + Auth (email/password)
- **ElevenLabs** : Webhooks post-call + Server Tools + WhatsApp outbound
- **Deploy** : Vercel sur `app.getvoxena.com`

## Architecture

### Deux dashboards, une app
- `(dashboard)/` — Interface restaurant owner (voit ses commandes, son menu)
- `(admin)/` — Super admin Voxena (voit tous les restaurants, logs, onboarding)
- `(auth)/login` — Page de connexion commune

### Flux de données
```
Client appelle → ElevenLabs Agent → Server Tool /api/orders/create → Supabase
                                  → Webhook post-call → enrichit ordre + WhatsApp
```

### Auth & rôles
- `admin` : équipe Voxena — accès total cross-restaurant
- `owner` : restaurateur — accès uniquement à son restaurant_id
- RLS Supabase filtre par restaurant_id + rôle

## Base de données
Tables principales : `profiles`, `restaurants`, `menus`, `menu_items`, `orders`, `order_events`, `agent_logs`

## Brand Voxena
```
--violet: #4237C4
--blue: #74a3ff
--navy: #0E1333
--navy-deep: #080B1F
--green: #1a9a5a
--green-soft: #34d399
--bg: #FAFBFE
```
Fonts : Space Grotesk (headings), Inter (body), JetBrains Mono (données/mono)

## Conventions
- Commentaires en francais
- Noms de variables/fonctions en anglais
- Tous les textes UI en francais
- Statuts commande : `nouvelle`, `en_preparation`, `prete`, `livree`, `recuperee`, `annulee`

## Variables d'environnement
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ELEVENLABS_API_KEY
ELEVENLABS_WEBHOOK_SECRET
```

## Commandes
```bash
npm run dev      # Dev server (localhost:3000)
npm run build    # Build production
npm run lint     # ESLint
```
