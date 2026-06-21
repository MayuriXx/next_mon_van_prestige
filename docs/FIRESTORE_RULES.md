# Règles de sécurité Firestore

## Configuration requise

Copier-coller ces règles dans **Firebase Console → Firestore Database → Rules** :

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // ============================================================
    // LECTURES PUBLIQUES - pour le site
    // ============================================================
    
    // Collections publiques : lectures par tous
    match /{document=**} {
      allow read: if true;
    }
    
    // ============================================================
    // ÉCRITURES - réservées aux authentifiés (admin)
    // ============================================================
    
    // Services
    match /services/{document=**} {
      allow write: if request.auth != null && request.auth.uid in get(/databases/$(database)/documents/config/admins).data.uids;
    }
    
    // Véhicules
    match /vehicles/{document=**} {
      allow write: if request.auth != null && request.auth.uid in get(/databases/$(database)/documents/config/admins).data.uids;
    }
    
    // Sections
    match /sections/{document=**} {
      allow write: if request.auth != null && request.auth.uid in get(/databases/$(database)/documents/config/admins).data.uids;
    }
    
    // Images
    match /images/{document=**} {
      allow write: if request.auth != null && request.auth.uid in get(/databases/$(database)/documents/config/admins).data.uids;
    }
    
    match /vehicle_images/{document=**} {
      allow write: if request.auth != null && request.auth.uid in get(/databases/$(database)/documents/config/admins).data.uids;
    }
    
    match /section_images/{document=**} {
      allow write: if request.auth != null && request.auth.uid in get(/databases/$(database)/documents/config/admins).data.uids;
    }
    
    // Tarifs
    match /tarifs/{document=**} {
      allow write: if request.auth != null && request.auth.uid in get(/databases/$(database)/documents/config/admins).data.uids;
    }
  }
}
```

## ✅ Après avoir copié les règles

1. Cliquer **"Publier"** dans Firebase Console
2. Attendre que la déploiement se termine
3. **Rafraîchir** ton site (`npm run dev`)

## 📝 Notes

- **Lectures publiques** : `allow read: if true;` → tout le monde peut lire
- **Écritures restreintes** : seuls les admins dans `config/admins` peuvent écrire
- Besoin de créer un doc `config/admins` avec les UIDs autorisés (plus tard)

## Pour plus tard (Issue #21)

Lors du dev du panel admin, créer:
```javascript
// Document: config/admins
{
  uids: ["uid-de-mohammed@gmail.com", "autre-admin"]
}
```
