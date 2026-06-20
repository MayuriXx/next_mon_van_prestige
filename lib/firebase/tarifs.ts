import { db } from '@/lib/firebase/config';
import { collection, getDocs, query } from 'firebase/firestore';

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
    const tarifs: TransfertTarif[] = [];

    // Aéroports
    const aeroportsRef = collection(db, 'tarifs', 'aeroports', 'destinations');
    const aeroportsQuery = query(aeroportsRef);
    const aeroportsSnap = await getDocs(aeroportsQuery);
    
    aeroportsSnap.docs.forEach((doc) => {
      tarifs.push({
        id: doc.id,
        name: doc.data().name || doc.id,
        category: 'aeroport',
        ...doc.data(),
      } as TransfertTarif);
    });

    // Destinations spéciales (ASTERIX, WALIBI, DISNEY, etc.)
    const destinationsRef = collection(db, 'tarifs', 'destinations', 'speciales');
    const destinationsQuery = query(destinationsRef);
    const destinationsSnap = await getDocs(destinationsQuery);
    
    destinationsSnap.docs.forEach((doc) => {
      tarifs.push({
        id: doc.id,
        name: doc.data().name || doc.id,
        category: 'destination',
        ...doc.data(),
      } as TransfertTarif);
    });

    // Mise à disposition (tarif horaire)
    const hourlyRef = collection(db, 'tarifs', 'hourly', 'rates');
    const hourlyQuery = query(hourlyRef);
    const hourlySnap = await getDocs(hourlyQuery);
    
    hourlySnap.docs.forEach((doc) => {
      tarifs.push({
        id: doc.id,
        name: doc.data().name || 'MAD',
        category: 'hourly',
        ...doc.data(),
      } as TransfertTarif);
    });

    return tarifs;
  } catch (error) {
    console.error('Error fetching tarifs:', error);
    return [];
  }
}

// Récupérer tarifs par catégorie
export async function getTarifsByCategory(
  category: 'aeroport' | 'destination' | 'hourly'
): Promise<TransfertTarif[]> {
  const allTarifs = await getAllTarifs();
  return allTarifs.filter((t) => t.category === category);
}
