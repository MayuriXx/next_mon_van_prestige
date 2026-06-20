# Issue #8 — Homepage Implementation

## 📋 Vue d'ensemble

Implémentation complète de la page d'accueil avec structure **100% dynamique via Firestore** et **Firebase Storage**. Mohammed peut mettre à jour images, tarifs, et contenu sans déploiement.

## 🏗️ Architecture

### **Composants créés**
```
components/sections/
├─ Hero.tsx              # Image + Titre + CTA
├─ Services.tsx          # 6 icônes services (de Firestore)
├─ Vehicles.tsx          # 3 cartes véhicules + images
├─ Tarifs.tsx           # Grille dynamique tarifs
├─ ServiceSection.tsx    # Sections alternées texte/image
└─ About.tsx            # À Propos + valeurs
```

### **Services Firestore** (lib/firebase/)
```
lib/firebase/
├─ images.ts           # Récupère images depuis Storage
├─ tarifs.ts           # Récupère tous les tarifs
└─ contenu.ts          # Récupère services, véhicules, sections
```

### **Structure Firestore requise**

```
images/
├─ hero → {url, alt}
└─ vehicles/
   └─ all/
      ├─ business → {url, alt, position}
      └─ van → {url, alt, position}

contenu/
├─ services/list/
│  ├─ confiabilite → {name, description, icon, slug, position}
│  ├─ assurance
│  └─ ... (6 total)
├─ vehicles/list/
│  ├─ business → {name, description, features[], position}
│  └─ van
└─ sections/
   ├─ transfert-aeroport → {title, description, imagePosition}
   ├─ transfert-simple
   └─ ... (6 total)

tarifs/
├─ aeroports/destinations/
│  ├─ cdg → {name, business, van}
│  ├─ orly
│  └─ ... (tous les aéroports)
├─ destinations/speciales/
│  └─ ... (ASTERIX, WALIBI, DISNEY, etc.)
└─ hourly/rates/
   └─ mad → {name, business, van}
```

## 🚀 Intégration

### **1. Créer la structure Firestore**
Voir `docs/FIRESTORE_SEED.md` pour les données d'exemple

### **2. Upload des images** (avant de remplir Firestore)
```bash
# Firebase Storage structure
gs://mon-van-prestige.appspot.com/
├─ images/hero/
├─ images/vehicles/
└─ images/sections/
```

### **3. Remplir Firestore**
- Via Firebase Console UI
- Via Admin SDK (script Python/Node)
- Via Cloud Firestore Import

### **4. Vérifier les URLs**
```javascript
// Chaque doc images/ doit avoir:
{
  url: "https://firebasestorage.googleapis.com/...",
  alt: "Description"
}
```

## 📝 Données requises

### **Services (6)**
- Confiabilité, Assurance, VIP, Confort, Flotte, Impeccable
- Chacun: `name`, `description`, `icon`, `slug`, `position`

### **Véhicules (2)**
- Business, Van
- Chacun: `name`, `description`, `features[]`, `position`

### **Sections (6)** 
- Transfert aéroport, Simple, MAD, Événements, Loisirs, Pro
- Chacun: `title`, `description`, `imagePosition` (left|right)

### **Tarifs**
- Aéroports: CDG, ORLY, ZAVENTEM, CHARLEROI, LESQUIN, GARES
- Destinations: ASTERIX, WALIBI, DISNEY, LENS, LOSC
- MAD: À l'heure
- Format: `business: "XXX€"`, `van: "YYY€"`, etc.

## 🎨 Design

✅ **Responsive** (mobile → desktop)  
✅ **Dark theme** (noir + or)  
✅ **Dynamique** (tout depuis Firestore)  
✅ **Accessible** (sémantique, alt text)  

## 🔄 Flux de mise à jour

1. Mohammed modifie dans admin panel → sauvegarde Firestore
2. Homepage récupère via service Firestore → affichage automatique
3. **Pas de redéploiement!**

## 📱 Pages utilisées

- `/` (homepage) ← Cette implémentation
- `/services/[slug]` (détails) ← Déjà créées
- `/admin/images` (upload images) → Issue #21+
- `/admin/tarifs` (edit tarifs) → Issue #21+
- `/admin/contenu` (edit contenu) → Issue #21+

## ⚠️ Points importants

### **URLs Firestore Storage**
Chaque image a une URL comme:
```
https://firebasestorage.googleapis.com/v0/b/{PROJECT}.appspot.com/o/{PATH}?alt=media
```

### **Fallbacks**
Si une image manque:
- Placeholder gris s'affiche
- Pas de crash de la page

### **Performance**
- Images avec `priority` pour hero
- Lazy loading pour autres
- Pagination des tarifs possible

## 🎯 Prochaines étapes

- [ ] Remplir Firestore avec données
- [ ] Upload images vers Storage
- [ ] Tester sur développement
- [ ] Admin panel pour modifications (Issue #21)

## 📚 Références

- `docs/FIRESTORE_SEED.md` - Données d'exemple
- `lib/firebase/images.ts` - Service images
- `lib/firebase/tarifs.ts` - Service tarifs
- `lib/firebase/contenu.ts` - Service contenu
