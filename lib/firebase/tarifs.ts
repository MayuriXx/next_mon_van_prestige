import { db } from '@/lib/firebase/config';
import { collection, getDocs, query } from 'firebase/firestore';
import { tarifsData } from '@/lib/data/tarifs';

export interface PricingData {
  business?: number | string;
  van?: number | string;
  hourly?: number | string;
}

export interface TransfertTarif extends PricingData {
  name: string;
  id: string;
  category: 'aeroport' | 'destination' | 'hourly';
}

// Récupérer tous les tarifs
export async function getAllTarifs(): Promise<TransfertTarif[]> {
  try {
    // Essayer Firestore d'abord
    const tarifsRef = collection(db, 'tarifs');
    const tarifsQuery = query(tarifsRef);
    const tarifsSnap = await getDocs(tarifsQuery);
    
    if (tarifsSnap.docs.length > 0) {
      const tarifs: TransfertTarif[] = [];
      tarifsSnap.docs.forEach((doc) => {
        tarifs.push({
          id: doc.id,
          name: doc.data().name || doc.id,
          category: doc.data().category || 'aeroport',
          ...doc.data(),
        } as TransfertTarif);
      });
      return tarifs;
    }
  } catch (error) {
    console.log('Firestore unavailable for tarifs, using local data');
  }
  
  // Fallback: données locales
  return tarifsData;
}

// Récupérer tarifs par catégorie
export async function getTarifsByCategory(
  category: 'aeroport' | 'destination' | 'hourly'
): Promise<TransfertTarif[]> {
  const allTarifs = await getAllTarifs();
  return allTarifs.filter((t) => t.category === category);
}
