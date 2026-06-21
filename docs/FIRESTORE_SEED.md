# Structure Firestore - Issue #8 Homepage

## ⚠️ IMPORTANT : Structure CORRIGÉE

Les collections doivent être **FLAT** avec **nombre pair de segments** :

```
❌ INCORRECT: contenu/sections/transfert-aeroport  (3 segments)
✅ CORRECT:  sections/transfert-aeroport            (2 segments)
```

## 📊 Structure Firestore

### **Collection: services**
```javascript
services/
├─ confiabilite → {
    name: "Confiabilité",
    description: "Service fiable et professionnel",
    icon: "✓",
    slug: "confiabilite",
    position: 1
  }
├─ assurance
├─ vip
├─ confort
├─ flotte
└─ impeccable
```

### **Collection: vehicles**
```javascript
vehicles/
├─ business → {
    name: "Berline Business",
    description: "Pour vos trajets élégants",
    features: ["Capacité: 4", "Confortable", "Premium"],
    position: 1
  }
└─ van → {
    name: "Van Premium",
    description: "Pour les groupes",
    features: ["Grande Capacité: 6-8", "Groupes", "Bagage XXL"],
    position: 2
  }
```

### **Collection: sections** (contenu texte)
```javascript
sections/
├─ transfert-aeroport → {
    title: "Transfert Aéroport Sécurisé",
    description: "Accédez aux aéroports...",
    imagePosition: "left"
  }
├─ transfert-simple → {
    title: "Transfert Simple & Rapide",
    description: "Pour vos trajets ponctuels...",
    imagePosition: "right"
  }
├─ mise-a-disposition
├─ evenements-speciaux
├─ escapades-loisirs
└─ deplacements-professionnels
```

### **Collection: images** (logo, etc.)
```javascript
images/
└─ hero → {
    url: "https://firebasestorage.googleapis.com/...",
    alt: "Aéroport - Transfer Premium"
  }
```

### **Collection: vehicle_images**
```javascript
vehicle_images/
├─ business → {
    url: "https://firebasestorage.googleapis.com/...",
    alt: "Berline Business",
    position: 1
  }
└─ van → {
    url: "https://firebasestorage.googleapis.com/...",
    alt: "Van Premium",
    position: 2
  }
```

### **Collection: section_images**
```javascript
section_images/
├─ transfert-aeroport → {
    url: "https://firebasestorage.googleapis.com/...",
    alt: "Transfert Aéroport"
  }
├─ transfert-simple
├─ mise-a-disposition
├─ evenements-speciaux
├─ escapades-loisirs
└─ deplacements-professionnels
```

### **Collection: tarifs**
```javascript
tarifs/
├─ cdg → {
    name: "Paris CDG",
    business: "300-390€",
    van: "390-550€",
    category: "aeroport"
  }
├─ orly → { ... }
├─ zaventem → { ... }
├─ charleroi → { ... }
├─ lesquin → { ... }
├─ gares → { ... }
├─ asterix → {
    name: "Parc Asterix",
    business: "275-350€",
    van: "360-450€",
    category: "destination"
  }
├─ walibi
├─ disney
├─ lens
├─ losc
└─ mad → {
    name: "Mise à Disposition",
    business: "55€/h",
    van: "90€/h",
    category: "hourly"
  }
```

## 🚀 Étapes de création

### 1️⃣ Créer les collections + documents via Firebase Console

### 2️⃣ Remplir les données exemple (voir ci-dessus)

### 3️⃣ Upload images vers **Firebase Storage**

Structure:
```
gs://mon-van-prestige.appspot.com/
├─ images/hero/aeroport.jpg
├─ images/vehicles/business.jpg
├─ images/vehicles/van.jpg
├─ images/sections/transfert-aeroport.jpg
├─ images/sections/transfert-simple.jpg
├─ images/sections/mise-a-disposition.jpg
├─ images/sections/evenements-speciaux.jpg
├─ images/sections/escapades-loisirs.jpg
└─ images/sections/deplacements-professionnels.jpg
```

### 4️⃣ Mettre à jour les URLs dans Firestore

Exemple:
```javascript
// images/hero
{
  url: "https://firebasestorage.googleapis.com/v0/b/mon-van-prestige.appspot.com/o/images%2Fhero%2Faeroport.jpg?alt=media",
  alt: "Aéroport - Transfer Premium"
}
```

### 5️⃣ Configurer les règles Firestore

Voir `docs/FIRESTORE_RULES.md`

## ✅ Vérification

```javascript
// Dans la console browser, chercher pour:
// ✓ Collections créées
// ✓ Documents avec données
// ✓ URLs valides
// ✓ Images visibles
```

## 💡 Données minimales pour démarrer

Tu peux commencer avec:
- **1 image hero** (peut être une placeholder)
- **6 services** avec icônes emoji
- **2 vehicles** avec images
- **6 sections** avec texte
- **12 tarifs** de base
