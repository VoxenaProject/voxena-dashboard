# Branchement Agent ElevenLabs ↔ Dashboard Voxena

## Architecture

```
Client appelle le restaurant
        ↓
ElevenLabs Agent (vocal IA)
        ↓
    ┌───┴───────────────────────┐
    │ Pendant l'appel :         │
    │ → Server Tool: GET menu   │
    │ → Server Tool: POST order │
    └───┬───────────────────────┘
        ↓
    ┌───┴───────────────────────┐
    │ Après l'appel :           │
    │ → Webhook POST post-call  │
    │   (transcript + audio)    │
    └───┬───────────────────────┘
        ↓
Dashboard Voxena (realtime)
```

## 1. Configurer l'agent ElevenLabs

### Server Tools (pendant l'appel)

#### Tool 1 : Récupérer le menu
L'agent doit pouvoir lire le menu du restaurant pour recommander des plats.

```json
{
  "name": "get_menu",
  "description": "Récupère le menu complet du restaurant avec catégories et articles",
  "method": "GET",
  "url": "https://app.getvoxena.com/api/menu?restaurant_id={RESTAURANT_ID}",
  "headers": {}
}
```

#### Tool 2 : Créer une commande
L'agent crée la commande quand le client a confirmé.

```json
{
  "name": "create_order",
  "description": "Crée une nouvelle commande pour le restaurant",
  "method": "POST",
  "url": "https://app.getvoxena.com/api/orders/create",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "restaurant_id": "{RESTAURANT_ID}",
    "customer_name": "{{customer_name}}",
    "customer_phone": "{{customer_phone}}",
    "items": "{{items_string}}",
    "order_type": "{{emporter_ou_livraison}}",
    "special_instructions": "{{instructions}}",
    "pickup_time": "{{heure_retrait}}",
    "delivery_address": "{{adresse_livraison}}"
  }
}
```

Format items_string : `"2x Pizza Margherita, 1x Tiramisu, 1x Coca-Cola"`

### Webhook post-call

Configurer le webhook ElevenLabs pour envoyer les données post-appel :

```
URL: https://app.getvoxena.com/api/webhooks/elevenlabs
Method: POST
Secret: (générer et mettre dans ELEVENLABS_WEBHOOK_SECRET)
```

Le webhook enrichit la commande avec :
- Transcription complète de l'appel
- URL audio de l'enregistrement
- Métadonnées de la conversation

## 2. Variables d'environnement

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# ElevenLabs
ELEVENLABS_API_KEY=xi_...
ELEVENLABS_WEBHOOK_SECRET=whsec_... # Généré dans le dashboard ElevenLabs
```

## 3. Lier un restaurant à son agent

### Dans la DB
Chaque restaurant a un champ `agent_id` (TEXT) qui correspond à l'ID de l'agent ElevenLabs.

### Dans le dashboard admin
1. Aller dans `/admin/restaurants/new` ou `/admin/restaurants/[id]`
2. Renseigner l'Agent ID ElevenLabs
3. Le statut de l'agent (`active`, `paused`, `error`) est affiché

### Dans ElevenLabs
1. Créer un agent conversationnel
2. Dans les Server Tools, configurer les 2 tools ci-dessus avec le `restaurant_id` du restaurant dans la DB
3. Configurer le webhook post-call

## 4. Flow complet d'une commande

1. **Client appelle** → ElevenLabs décroche
2. **Agent lit le menu** → GET `/api/menu?restaurant_id=xxx`
3. **Agent prend la commande** → dialogue avec le client
4. **Agent confirme** → POST `/api/orders/create`
5. **Dashboard reçoit** → Realtime Supabase → notification sonore
6. **Restaurant gère** → Accepter → Préparer → Prête → Récupérée/Livrée
7. **Post-appel** → Webhook enrichit la commande avec transcript
8. **(Futur)** WhatsApp → Confirmation envoyée au client

## 5. Test en local

```bash
# Lancer le seed pour créer un restaurant de demo
curl -X POST http://localhost:3000/api/seed

# Se connecter avec le compte owner
# Email: mario@chezmario.be
# Password: demo1234

# Simuler une commande entrante
curl -X POST http://localhost:3000/api/orders/create \
  -H "Content-Type: application/json" \
  -d '{
    "restaurant_id": "RESTAURANT_ID_DU_SEED",
    "customer_name": "Test Client",
    "customer_phone": "+32 470 00 00 00",
    "items": "1x Pizza Margherita, 2x Coca-Cola",
    "order_type": "emporter",
    "pickup_time": "14:30"
  }'
```
